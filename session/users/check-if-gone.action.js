'use strict';

const CHECK_IF_GONE = 'CHECK_IF_GONE';

const checkIfGone = (userId) => {
    return {
        type: CHECK_IF_GONE,
        userId: userId
    };
};

checkIfGone.CHECK_IF_GONE = CHECK_IF_GONE;

module.exports = checkIfGone;