'use strict';

const fs = require('fs');
const http = require('http');

exports.register = function () {
    const plugin = this;
    plugin.inherits('rcpt_to.host_list_base');

    plugin.cfg = plugin.config.get('rcpt_to.mba.ini', 'ini');

    plugin.load_host_list();
}

exports.hook_rcpt = function (next, connection, params) {
    const plugin = this;

    // inspired by other plugins
    const txn = connection.transaction;
    if (!txn) return next();

    const rcpt = params[0].address();

    // in this case, a client with relaying privileges is sending FROM a local
    // domain. For them, any RCPT address is accepted.
    if (connection.relaying && txn.notes.local_sender) {
        txn.results.add(plugin, {pass: 'relaying local_sender'});
        return next(OK);
    }

    const mba_url = 'http://' + plugin.cfg.main.server + '/address-to-user/' + rcpt;
    connection.loginfo(plugin, "connecting to mba url: " + mba_url);

    http.get(mba_url, (res) => {
        const { statusCode } = res;

        if (statusCode === 404) {
            // no user found
            // without the OK, the mail will be rejected
            return next();
        } else if (statusCode !== 200) {
            connection.loginfo(plugin, "returned status code from mba: " + statusCode);
            return next(DENYSOFT, 'Backend failure. Please, retry later');
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                // const parsedData = JSON.parse(rawData);
                // it doesn't matter which user, we return OK
                txn.results.add(plugin, {pass: 'rcpt_to'});
                return next(OK);
            } catch (e) {
                connection.loginfo(plugin, "mba error: " + e);
                return next(DENYSOFT, 'Backend failure. Please, retry later');
            }
        });
    }).on('error', (e) => {
        connection.loginfo(plugin, "mba error: " + e);
        return next(DENYSOFT, 'Backend failure. Please, retry later');
    });
}