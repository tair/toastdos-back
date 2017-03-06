// Update with your config settings.

module.exports = {

  development: {
    client: 'sqlite3',
    connection: {
      filename: './database.sqlite3'
    },
    useNullAsDefault: true,
    seeds: {
        directory: './seeds'
    }
  },

  test: {
    client: 'sqlite3',
    connection : {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    seeds: {
      directory: './seeds/test'
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
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
