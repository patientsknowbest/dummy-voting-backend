'use strict';

const _ = require('lodash');
const redux = require('redux');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const rest = express.Router();

const wss = require('express-ws')(app);

const openSession = require('./session/status/open-session');
const closeSession = require('./session/status/close-session');
const sessionState = require('./session/status/session-state');

const userState = require('./session/users/user-state');
const userConnecting = require('./session/users/user-connecting.action');
const userDisconnecting = require('./session/users/user-disconnecting.action');
const userUpdated = require('./session/users/recovered-user-updated.action');
const upVote = require('./session/vote/upvote.action');

let userRecovery = require('./session/users/user-recovery.middleware');

const initialState = require('./initial-state');

const store = redux.createStore(redux.combineReducers({
    session: (session, action) => {
        if (!!session) {
            return {
                status: sessionState(session.status, action),
                wentWellItems: session.wentWellItems,
                toBeImprovedItems: session.toBeImprovedItems,
                users: userState(session.users, action),
                votes: session.votes,
                wentWellVoteLimit: session.wentWellVoteLimit,
                toBeImprovedVoteLimit: session.toBeImprovedVoteLimit
            }
        } else {
            return initialState.session;
        }

    },
    users: (users, action) => {
        return !!users ? users : initialState.users;
    }
}), initialState, redux.applyMiddleware(userRecovery));


function broadcast(message) {
    wss.getWss().clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(message))
        }
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

function handleWentWellVote(response, votedItemsByUser, wentWellItemIds, itemId, userId) {
    const wentWellItemVoteCountForUser = _.intersection(votedItemsByUser, wentWellItemIds).length;

    if (wentWellItemVoteCountForUser < state.session.wentWellVoteLimit) {
        store.dispatch(upVote(userId, itemId));
        response.send({ok: true, message: {messageCode: 'vote.dispatched'}});
    } else {
        response.status(400);
        response.send({
            errors: [
                {errorCode: 'all.available.vote.in.went.well.category.is.used', description: 'Item is neither in went well nor in to be improved category.'}
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

function voteWithOpenSession(request, response) {

    const itemId = parseInt(request.params.itemId);
    const userId = request.params.userId;

    const state = store.getState();

    const votedItemsByUser = _
        .chain(state.votes)
        .filter((vote) => vote.userId === userId)
        .map((vote) => vote.itemId)
        .value();

    const wentWellItemIds = _.map(state.session.wentWellItems, 'id');
    const toBeImprovedItemIds = _.map(state.session.toBeImprovedItems, 'id');

    console.log(wentWellItemIds, toBeImprovedItemIds, itemId);

    const isInWentWellCategory = _.filter(wentWellItemIds, (wentWellItemId) => itemId === wentWellItemId).length > 0;
    const isInToBeImprovedCategory = _.filter(toBeImprovedItemIds, (toBeImprovedItemId) => itemId === toBeImprovedItemId).length > 0;

    if (isInWentWellCategory) {
        handleWentWellVote(response, votedItemsByUser, wentWellItemIds, itemId, userId);
    } else if (isInToBeImprovedCategory) {
        handleToBeImprovedVote(response, votedItemsByUser, toBeImprovedItemIds, itemId, userId);
    } else {
        handleUncategorizedVote(response);
    }
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
    } else if (state.session.users.connected.length !== newState.session.users.connected.length) {
        if (state.session.users.connected.length < newState.session.users.connected.length) {
            // user(s) left
            const removedUsers = _.difference(newState.session.users.connected, state.session.users.connected);
            broadcast({
                message: `participant list has changed (${newState.session.users.connected.length})`,
                removedUsers: removedUsers
            });
        } else {
            // user(s) joined
            const addedUsers = _.difference(state.session.users.connected, newState.session.users.connected);
            broadcast({
                message: `participant list has changed (${newState.session.users.connected.length})`,
                addedUsers: addedUsers
            });
        }

        console.log(`Connected users: ${newState.session.users.connected}`);

    } else if ('' !== newState.session.users.recovered) {
        sendTo({message: 'blah'}, newState.session.users.recovered);
        store.dispatch(userUpdated(newState.session.users.recovered));
    } else if (state.session.votes.length !== newState.session.votes.length) {
        broadcast({action: 'vote_progress_update'});
        console.log(`Vote update broadcaster`);
    } else {
        console.log(`something else.`);
    }

    state = newState;
});

rest.post('/session/start', (request, response) => {
    store.dispatch(openSession());
    response.send({ok: true});
});
rest.post('/session/close', (request, response) => {
    store.dispatch(closeSession());
    response.send({ok: true});
});

rest.post('/vote/:itemId/user-id/:userId', (request, response) => {
    if (state.session.status === 'OPENED') {
        voteWithOpenSession(request,response);
    } else {
        handleSessionNotOpened(response);
    }
});

rest.delete('/vote/:itemId', (request, response) => {

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
