'use strict';

/**
 * Command line tool for assigning/removing roles to/from a User.
 */

const User = require('../models/user');
const Role = require('../models/role');

const OP_ADD = 'add';
const OP_REMOVE = 'remove';

let operation = process.argv[2];
let role      = process.argv[3];
let orcidId   = process.argv[4];

let userName; // Set this from retrieved user

Promise.all([
	User.where('orcid_id', orcidId).fetch({withRelated: 'roles', require: true}),
	Role.where('name', role).fetch({require: true})
]).then(([user, role]) => {
	userName = user.get('name');

	if (operation === OP_ADD) return user.roles().attach(role);
	if (operation === OP_REMOVE) return user.roles().detach(role);
}).then(() => {
	// Print output in proper english
	let pastTense;
	if (operation == OP_ADD) pastTense = 'ed to';
	if (operation == OP_REMOVE) pastTense = 'd from';

	console.log(`Role '${role}' ${operation}${pastTense} user '${userName}' (orcid id: ${orcidId})`);

	process.exit(0);
}).catch(err => {
	// When User already had the Role
	if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed')
		|| err.message.includes('duplicate key value violates unique constraint')) {

		console.log(`User '${userName}' (orcid id: ${orcidId}) already has role '${role}'`);
		process.exit(0);
	}

	console.error(err);
	process.exit(1);
});
