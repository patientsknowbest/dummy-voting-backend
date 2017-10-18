'use strict';

const UP_VOTE = 'UP_VOTE';

const upVote = (userId, itemId) => {
    return {
        type: UP_VOTE,
        userId: userId,
        itemId: itemId
    };
};

upVote.UP_VOTE = UP_VOTE;

module.exports = upVote;