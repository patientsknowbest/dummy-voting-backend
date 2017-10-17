'use strict';

const USER_RECOVERED = 'USER_RECOVERED';

const userRecovered = (userId) => {
    return {
        type: USER_RECOVERED,
        userId: userId
    }
};

userRecovered.USER_RECOVERED = USER_RECOVERED;

module.exports = userRecovered;