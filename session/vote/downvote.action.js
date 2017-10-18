'use strict';

const DOWN_VOTE = 'DOWN_VOTE';

const downVote = (userId, itemId) => {
    return {
        type: DOWN_VOTE,
        userId: userId,
        itemId: itemId
    };
};

downVote.DOWN_VOTE = DOWN_VOTE;

module.exports = downVote;