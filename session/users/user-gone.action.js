'use strict';

const USER_GONE = 'USER_GONE';

const userGone = (userId) => {
    return {
        type: USER_GONE,
        userId: userId
    };
};

userGone.USER_GONE = USER_GONE;

module.exports = userGone;