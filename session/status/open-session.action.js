'use strict';

const OPEN_SESSION = 'OPEN_SESSION';

const openSession = () => {
    return {type: OPEN_SESSION};
};

openSession.OPEN_SESSION = OPEN_SESSION;

module.exports = openSession;