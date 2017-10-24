// Update with your config settings.

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      database: 'toastdos_development',
      user:     'toastdos',
      password: 'vulpes'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds/test'
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      database: 'toastdos_test',
      user:     'toastdos',
      password: 'vulpes'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds/test'
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'toastdos_staging',
      user:     'toastdos',
      password: 'vulpes'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DBHOST,
      port: process.env.DBPORT,
      database: "toastdos_prod",
      user: process.env.DBUSER,
      password: process.env.DBPASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }

};
