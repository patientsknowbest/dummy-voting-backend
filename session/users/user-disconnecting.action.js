'use strict';

const DISCONNECTING = 'DISCONNECTING';

const userDisconnecting = (userId) => {
    return {
        type: DISCONNECTING,
        userId: userId
    };
};

userDisconnecting.DISCONNECTING = DISCONNECTING;

module.exports = userDisconnecting;