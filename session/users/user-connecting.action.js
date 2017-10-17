'use strict';

const JOINING_SESSION= 'JOINING_SESSION';

const userConnecting = (userId) => {
    return {
        type: 'JOINING_SESSION',
        userId: userId
    };
};

userConnecting.JOINING_SESSION = JOINING_SESSION;

module.exports = userConnecting;