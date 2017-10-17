'use strict';

const CLOSE_SESSION = 'CLOSE_SESSION';

const closeSession = () => {
    return {type: CLOSE_SESSION};
};

closeSession.CLOSE_SESSION = CLOSE_SESSION;

module.exports = closeSession;