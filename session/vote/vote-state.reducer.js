'use strict';

const _ = require('lodash');

const UP_VOTE = require('./upvote.action').UP_VOTE;
const DOWN_VOTE = require('./downvote.action').DOWN_VOTE;

const voteState = (votes, action) => {
    switch (action.type) {
        case UP_VOTE:

            const newVotes = votes.slice(0);
            newVotes.push({
                userId: action.userId,
                itemId: action.itemId
            });

            return newVotes;

        case DOWN_VOTE:
            const voteIndex = _.findIndex(votes, (vote) => vote.itemId === action.itemId && vote.userId === action.userId);

            if (voteIndex >= -1) {
                const newVotes = votes.slice(0);
                newVotes.splice(voteIndex, 1);
                return newVotes;
            }

            return votes;
        default:
            return votes;
    }
};

module.exports = voteState;