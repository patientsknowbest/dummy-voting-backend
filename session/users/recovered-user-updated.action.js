'use strict';

const USER_UPDATED = 'USER_UPDATED';

const userUpdated = (userId) => {
    return {
        type: USER_UPDATED,
        userId: userId
    };
};

userUpdated.USER_UPDATED = USER_UPDATED;

module.exports = userUpdated;