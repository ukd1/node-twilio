var querystring = require('querystring');
var JWT = require('./jwt');

var Capability = function(accountSid, authToken) {
	this.accountSid = accountSid;
	this.authToken = authToken;
	this.scopes = [];
	this.clientName = false;	
};

var ScopeURI = function(service, privilege, params) {
	this.service = service;
	this.privilege = privilege;
	this.params = params || {};
};

Capability.prototype = {
	allowClientIncoming: function(clientName) {
		if(/\W/.test(clientName))
			throw new Error('Only alphanumeric characters allowed in client name.');
		if(!('' + clientName).length)
			throw new Error('Client name must not be a zero length string.');
		this.clientName = clientName;
		this.allow('client', 'incoming', { clientName: clientName });
		return this;
	},
	allowClientOutgoing: function(appSid, appParams) {
		appParams = appParams || {};
		this.allow('client', 'outgoing', { appSid: appSid, appParams: querystring.stringify(appParams) });
		return this;
	},
	allowEventStream: function(filters) {
		filters = filters || {};
		this.allow('stream', 'subscribe', { path: '/2010-04-01/Events', params: querystring.stringify(filters) });
		return this;
	},
	generateToken: function(ttl) {
		ttl = ttl || 3600;
		var payload = {
				scope: [],
				iss: this.accountSid,
				exp: ttl + new Date / 1000 + .5 | 0
			},
			scopeStrings = [],
			x = 0,
			len = this.scopes.length;
		for(; x < len; x++) {
			if(this.scopes[x].privilege == 'outgoing' && this.clientName)
				this.scopes[x].clientName = this.clientName;
			scopeStrings.push(this.scopes[x].toString());
		}
		payload.scope = scopeStrings.join(' ');
		return JWT.encode(payload, this.authToken, 'HS256');
	},
	allow: function(service, privilege, params) {
		this.scopes.push(new ScopeURI(service, privilege, params));
	}
};

ScopeURI.prototype = {
	toString: function() {
		var uri = ['scope', this.service, this.privilege].join(':'),
			queryString = querystring.stringify(this.params);
		if(queryString)
			uri += '?' + queryString;
		return uri;
	}
};

module.exports = Capability;
