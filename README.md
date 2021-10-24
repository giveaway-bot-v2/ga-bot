# Giveaway Bot

Code for the complete rewrite of the community ran giveaway bot.

## Setup

### Docker

It is fully recommended to use Docker, this will install PostgreSQL and manage
all dependencies.

When using Docker there is only one configuration necessary, it is the `TOKEN`
enviroment. Duplicate the `template.env` file and name it `.env` and fill it
in. After that simply execute the below command and the bot will start.

```bash
docker-compose up
```

### Manual

If you can't use Docker you can follow the steps below, you will need NodeJS
16.6.0+ and PostgreSQL.

#### 1. Install dependencies

Using NPM simply run `npm install`.

#### 2. Configuration

Duplicate the `template.env` file and name it `env`. Read the comments in
the file for help on how to fill it in.

#### 3. Build and run

Now build the project using `npm run build` followed by `npm start`.
