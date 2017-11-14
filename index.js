'use strict';

const _ = require('lodash');
const redux = require('redux');
const subscriber = require('redux-subscriber');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

const rest = express.Router();

const wss = require('express-ws')(app);

const openSession = require('./session/status/open-session.action');
const closeSession = require('./session/status/close-session.action');
const sessionState = require('./session/status/session-state.reducer');

const userConnecting = require('./session/users/user-connecting.action');
const userDisconnecting = require('./session/users/user-disconnecting.action');
const userUpdated = require('./session/users/recovered-user-updated.action');
const userRecovery = require('./session/users/user-recovery.middleware');
const userState = require('./session/users/user-state.reducer');

const upVote = require('./session/vote/upvote.action');
const downVote = require('./session/vote/downvote.action');
const voteState = require('./session/vote/vote-state.reducer');

const initialState = require('./initial-state');

const store = redux.createStore(redux.combineReducers({
    // FIXME: this feels hacky:
    session: (session, action) => {
        if (!!session) {
            return {
                // dynamic parts.
                status: sessionState(session.status, action),
                users: userState(session.users, action),
                votes: voteState(session.votes, action),
                // -- static parts.
                wentWellItems: session.wentWellItems,
                toBeImprovedItems: session.toBeImprovedItems,
                wentWellVoteLimit: session.wentWellVoteLimit,
                toBeImprovedVoteLimit: session.toBeImprovedVoteLimit,
                voteProgress: session.voteProgress
            }
        } else {
            return initialState.session;
        }
    },
    users: (users, action) => {
        return !!users ? users : initialState.users;
    }
}), initialState, redux.applyMiddleware(userRecovery));


const subscribe = subscriber.default(store);

// redux.applyMiddleware(userRecovery)((state, action) => redux.createStore)(initialState);


function broadcast(message) {
    wss.getWss().clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(message))
        }
    });
}

function broadcastVoteResult() {
    let voteCounts = _(state.session.votes).countBy('itemId')
        .map((count, itemId) => ({ itemId, count }))
        .value();

    broadcast({
        action: 'vote_result',
        message: `Session closed and vote result available`,
        voteResult: voteCounts
    });
}

function broadcastEveryOneBut(message, userId) {
    wss.getWss().clients.forEach((client) => {
        if (client.readyState === 1 && client.userId !== userId) {
            client.send(JSON.stringify(message))
        }
    });
}

function sendTo(message, userId) {
    wss.getWss().clients.forEach((client) => {
        if (client.readyState === 1 && client.userId === userId) {
            client.send(JSON.stringify(message))
        }
    });
}

function sendSessionStateSnapshot(userId) {

    let connectedUsersWithNames = [];

    for (let count = 0; count < state.session.users.connected.length; count++) {
        let userId = state.session.users.connected[count];
        let name = store.getState().users[userId].name;
        connectedUsersWithNames.push({userId: userId, userName: name});
    }

    let message = {
        action: "initial_state_transfer",
        messageCode: 'current.session.state',
        message: 'Snapshot of current session state',
        sessionStatus: state.session.status,
        votableToBeImprovedItems: state.session.toBeImprovedItems,
        votableDidWellItems: state.session.wentWellItems,
        connectedUsers: connectedUsersWithNames,
        voteProgress: state.session.voteProgress,
        votedItemsByUser: votedItemsByUser(userId, state.session.votes),
        wentWellVoteLimit: state.session.wentWellVoteLimit,
        toBeImprovedVoteLimit: state.session.toBeImprovedVoteLimit
    };
    sendTo(message, userId);
}

function handleWentWellVote(response, votedItemsByUser, wentWellItemIds, itemId, userId) {
    const wentWellItemVoteCountForUser = _.intersection(votedItemsByUser, wentWellItemIds).length;

    if (wentWellItemVoteCountForUser < state.session.wentWellVoteLimit) {
        store.dispatch(upVote(userId, itemId));
        response.send({ok: true, message: {messageCode: 'vote.dispatched'}});
    } else {
        response.status(400);
        response.send({
            errors: [
                {errorCode: 'all.available.vote.in.went.well.category.is.used', description: 'You have used all your votes for the went well category.'}
            ]
        });
    }
}

function handleToBeImprovedVote(response, votedItemsByUser, toBeImprovedItemIds, itemId, userId) {
    const toBeImprovedItemVoteCountForUser = _.intersection(votedItemsByUser, toBeImprovedItemIds).length;

    if (toBeImprovedItemVoteCountForUser < state.session.toBeImprovedVoteLimit) {
        store.dispatch(upVote(userId, itemId));
        response.send({ok: true, message: {messageCode: 'vote.dispatched'}});
    } else {
        response.status(400);
        response.send({
            errors: [
                {errorCode: 'all.available.vote.in.to.be.improved.category.is.used', description: 'Item is neither in went well nor in to be improved category.'}
            ]
        });
    }
}

function handleUncategorizedVote(response) {
    response.status(400);
    response.send({
        errors: [
            {errorCode: 'item.cannot.be.categorized', description: 'Item is neither in went well nor in to be improved category.'}
        ]
    });
}

function handleDuplicateVote(response) {
    response.status(400);
    response.send({
        errors: [
            {errorCode: 'duplicate.vote', description: 'Cannot vote for the same item twice.'}
        ]
    });
}

function votedItemsByUser(userId, votes) {
    return _
        .chain(votes)
        .filter((vote) => vote.userId === userId)
        .map((vote) => vote.itemId)
        .value();
}

function handleVote(request, response) {

    const itemId = parseInt(request.params.itemId);
    const userId = request.params.userId;

    const state = store.getState();

    let votedItemsByUserVar = votedItemsByUser(userId, state.session.votes);

    if (votedItemsByUserVar.includes(itemId)) {
        // This is a duplicate of an existing vote
        handleDuplicateVote(response);
        return;
    }

    const wentWellItemIds = _.map(state.session.wentWellItems, 'id');
    const toBeImprovedItemIds = _.map(state.session.toBeImprovedItems, 'id');

    const isInWentWellCategory = _.filter(wentWellItemIds, (wentWellItemId) => itemId === wentWellItemId).length > 0;
    const isInToBeImprovedCategory = _.filter(toBeImprovedItemIds, (toBeImprovedItemId) => itemId === toBeImprovedItemId).length > 0;

    if (isInWentWellCategory) {
        handleWentWellVote(response, votedItemsByUserVar, wentWellItemIds, itemId, userId);
    } else if (isInToBeImprovedCategory) {
        handleToBeImprovedVote(response, votedItemsByUserVar, toBeImprovedItemIds, itemId, userId);
    } else {
        handleUncategorizedVote(response);
    }
}

function isConnectedUser(userId) {
    return store.getState().session.users.connected.indexOf(userId) > -1;
}

function isOrganizer(userId) {
    return store.getState().users[userId].roles.indexOf('ORGANIZER') > -1;
}

function handleInvalidUser(response, userId) {
    response.status(400);
    response.send({
        errors: [
            {errorCode: 'user.not.connected', description: `User is not connected (${userId}).`}
        ]
    })
}

function handleNonOrganizerUserAttemptToChangeSessionState(response, userId) {
    response.status(403);
    response.send({
        errors: [
            {errorCode: 'forbidden', description: `User is forbidden to change session state (${userId}).`}
        ]
    })
}

function handleSessionNotOpened(response) {
    response.status(400);
    response.send({
        errors: [
            {errorCode: 'session.is.not.opened', description: `Session is not opened (${state.session.status}).`}
        ]
    })
}

let state = store.getState();
store.subscribe(() => {
    let newState = store.getState();

    if (state.session.status !== newState.session.status) {
        broadcast({
            action: 'session_state_change',
            from: state.session.status,
            to: newState.session.status
        });
    } else if (newState.session.users !== undefined && (state.session.users.connected.length !== newState.session.users.connected.length)) {
        if (state.session.users.connected.length < newState.session.users.connected.length) {
            // user joined
            let addedUser = _.difference(newState.session.users.connected, state.session.users.connected);
            sendSessionStateSnapshot(addedUser);
            broadcast({
                action: 'participant_list_addition',
                message: `User added to participant list (${newState.session.users.connected.length})`,
                userId: addedUser,
                userName: store.getState().users[addedUser].name,
                userCount: newState.session.users.connected.length
            });
        } else {
            // user left
            let removedUser = _.difference(state.session.users.connected, newState.session.users.connected)[0];
            broadcast({
                action: 'participant_list_deletion',
                message: `User removed from participant list (${newState.session.users.connected.length})`,
                userId: removedUser,
                userCount: newState.session.users.connected.length
            });
        }

        console.log(`Connected users: ${newState.session.users.connected}`);

    } else if (newState.session.users !== undefined && ('' !== newState.session.users.recovered)) {
        sendSessionStateSnapshot(newState.session.users.recovered);
        store.dispatch(userUpdated(newState.session.users.recovered));
    } else if (state.session.votes.length !== newState.session.votes.length) {
        if (state.session.votes.length < newState.session.votes.length) {
            // vote added
            let addedVote = _.difference(newState.session.votes, state.session.votes)[0];
            let newVoteUserId = addedVote.userId;
            // Get total number of votes for user (toBeImproved + wentWell)
            const totalVotesForUser = votedItemsByUser(newVoteUserId, newState.session.votes).length;
            let totalAllowedVotes = parseFloat(newState.session.toBeImprovedVoteLimit + newState.session.wentWellVoteLimit);
            let voteProgress = totalVotesForUser / totalAllowedVotes;
            newState.session.voteProgress[newVoteUserId] = voteProgress;
            broadcast({
                action: 'vote_progress_update',
                message: `User (${newVoteUserId}) up-voted`,
                userId: newVoteUserId,
                voteProgress: voteProgress
            });
        } else {
            // vote removed
            let removedVote = _.difference(state.session.votes, newState.session.votes)[0];
            let removedVoteUserId = removedVote.userId;
            // Get total number of votes for user (toBeImproved + wentWell)
            const totalVotesForUser = votedItemsByUser(removedVoteUserId, newState.session.votes).length;
            let totalAllowedVotes = parseFloat(newState.session.toBeImprovedVoteLimit + newState.session.wentWellVoteLimit);
            let voteProgress = totalVotesForUser / totalAllowedVotes;
            newState.session.voteProgress[removedVoteUserId] = voteProgress;
            broadcast({
                action: 'vote_progress_update',
                message: `User (${removedVoteUserId}) down-voted`,
                userId: removedVoteUserId,
                voteProgress: voteProgress
            });
        }
        console.log(`Vote update broadcaster`);
    } else {
        console.log(`something else.`);
    }

    state = newState;
});

rest.post('/session/start/user-id/:userId', (request, response) => {
    let userId = request.params.userId;
    if (isConnectedUser(userId, true)) {
        if (isOrganizer(userId)) {
            store.dispatch(openSession());
            response.send({ok: true});
        } else {
            handleNonOrganizerUserAttemptToChangeSessionState(response, userId);
        }
    } else {
        handleInvalidUser(response, userId);
    }
});
rest.post('/session/close/user-id/:userId', (request, response) => {
    let userId = request.params.userId;
    if (isConnectedUser(userId, true)) {
        if (isOrganizer(userId)) {
            store.dispatch(closeSession());
            broadcastVoteResult();
            response.send({ok: true});
        } else {
            handleNonOrganizerUserAttemptToChangeSessionState(response, userId);
        }
    } else {
        handleInvalidUser(response, userId);
    }
});

rest.post('/vote/:itemId/user-id/:userId', (request, response) => {
    let unsubscribe = subscribe('session.resultOfLastVote', (state) => {
        console.log(state.session.votes);
        unsubscribe();
    });

    let userId = request.params.userId;

    if (isConnectedUser(request.params.userId)) {
        if (state.session.status === 'OPENED') {
            handleVote(request, response);
        } else {
            handleSessionNotOpened(response);
        }
    } else {
        handleInvalidUser(response, userId);
    }
});

rest.delete('/vote/:itemId/user-id/:userId', (request, response) => {
    if (state.session.status === 'OPENED') {

        let deleteUserId = request.params.userId;
        let deleteItemId = parseInt(request.params.itemId, 10);

        let voteIndex = _.findIndex(state.session.votes, (vote) => vote.itemId === deleteItemId && vote.userId === deleteUserId, 0);
        if (voteIndex !== -1) {
            store.dispatch(downVote(deleteUserId, deleteItemId));
            response.send({ok: true});
        } else {
            response.send({
                errors: [
                    {errorCode: 'vote.not.found', description: `Cannot delete vote (${deleteItemId}).`}
                ]
            })
        }
    } else {
        handleSessionNotOpened(response);
    }
});

app.use('/api', rest);

app.use('/', express.static(__dirname + '/content')); // redirect root
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect CSS bootstrap
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/dist/fonts')); // redirect CSS bootstrap

app.ws('/session/:userId', (connection, request) => {
    let userId = request.params.userId;
    // let connectionKey = request.headers['sec-websocket-key'];

    connection.userId = userId;

    connection.on("message", function (message) {
        let event = JSON.parse(message);

        switch (event.action) {
            case 'CONNECTING':
                store.dispatch(userConnecting(userId));
                break;
        }
    });
    connection.on("close", function (code, reason) {
        store.dispatch(userDisconnecting(userId));
    });

    connection.on('error', function (error) {
        console.error(error);
    })
});

app.listen(1337, function () {
    console.log('Example app listening on port 1337!')
});
