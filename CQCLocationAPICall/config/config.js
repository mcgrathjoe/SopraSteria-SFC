
const convict = require('convict');
const fs = require('fs');
const yaml = require('js-yaml');

// AWS Secrets Manager override
const AWSSecrets = require('../aws/secrets');

const AppConfig = require('./appConfig');

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'preproduction', 'development', 'test', 'accessibility', 'localhost'],
    default: 'localhost',
    env: 'NODE_ENV'
  },
  log: {
    sequelize: {
      doc: 'Whether to log sequelize SQL statements',
      format: 'Boolean',
      default: false
    }
  },
  db: {
    host: {
      doc: 'Database host name/IP',
      format: String,
      default: 'localhost',
      env: 'DB_HOST'
    },
    database: {
      doc: 'Database name',
      format: String,
      default: 'sfcdevdb',
      env: 'DB_NAME'
    },
    username: {
        doc: 'Database username',
        format: String,
        default: 'sfcadmin',
        env: 'DB_USER'
    },
    password: {
        doc: 'Database username',
        format: '*',
      default: 'unknown',           // note - bug in notify - must provide a default value for it to use env var
        env: 'DB_PASS'
    },
    port: {
        doc: 'Database port',
        format: 'port',
        default: 5432,
        env: 'DB_PORT'
    },
    dialect: {
      doc: 'Database dialect (sequelize)',
      format: String,
      default: 'postgres'
    },
    ssl: {
      doc: 'Use SSL?',
      format: 'Boolean',
      default: false,
      env: 'DB_SSL'
    },
    client_ssl: {
      status: {
        doc: 'Client SSL enabled or not',
        format: 'Boolean',
        default: false,
        env: "DB_CLIENT_SSL_STATUS"
      },
      usingFiles: {
        doc: 'If true, retrieves client certificate, client key and root certificate from file; if false, using data values',
        format: 'Boolean',
        default: true,
      },
      files: {
        certificate: {
          doc: 'The full path location of the client certificate file',
          format: String,
          default: 'TBC',
          env: "DB_CLIENT_SSL_CERTIFICATE"
        },
        key: {
          doc: 'The full path location of the client key file',
          format: String,
          default: 'TBC',
          env: "DB_CLIENT_SSL_KEY"
        },
        ca: {
          doc: 'The full path location of the server certificate (authority - ca) file',
          format: String,
          default: 'TBC',
          env: "DB_CLIENT_SSL_CA"
        }
      },
      data: {
        certificate: {
          doc: 'The client certificate',
          format: String,
          default: 'TBC',
        },
        key: {
          doc: 'The client key',
          format: String,
          default: 'TBC',
        },
        ca: {
          doc: 'The server certificate (authority - ca)',
          format: String,
          default: 'TBC',
        }
      }
    }
  },
  aws: {
    region: {
      doc: 'AWS region',
      format: '*',
      default: 'eu-west-1'
    },
    bucketname: {
      doc: 'Bucket used to upload all CQC changes',
      format: '*',
      default: 'cqcchanges'
    },
    sqsqueue: {
      doc: 'SQS queue to send location changes',
      format: '*',
      default: 'https://sqs.eu-west-1.amazonaws.com/624216394565/cqctest'
    },
    secrets: {
      use: {
        doc: 'Whether to use AWS Secret Manager to retrieve sensitive information, e.g. DB_PASS. If false, expect to read from environment variables.',
        format: 'Boolean',
        default: false
      },
      wallet: {
        doc: 'The name of the AWS Secrets Manager wallet to recall from',
        format: String,
        default: 'bob'
      }
    }
  }
});

// Load environment dependent configuration
var env = config.get('env');

const envConfigfile = yaml.safeLoad(fs.readFileSync(__dirname + '/' + env + '.yaml'));

// load common file first, then env (so env overrides common)
config.load(envConfigfile);

// Perform validation
config.validate(
    {allowed: 'strict'}
);

// now, if defined, load secrets from AWS Secret Manager
if (config.get('aws.secrets.use')) {
  AWSSecrets.initialiseSecrets(
    config.get('aws.region'),
    config.get('aws.secrets.wallet')
  ).then(ret => {
    // DB rebind
    config.set('db.host', AWSSecrets.dbHost());
    config.set('db.password', AWSSecrets.dbPass());
    config.set('db.client_ssl.data.certificate', AWSSecrets.dbAppUserCertificate().replace(/\\n/g, "\n"));
    config.set('db.client_ssl.data.key', AWSSecrets.dbAppUserKey().replace(/\\n/g, "\n"));
    config.set('db.client_ssl.data.ca', AWSSecrets.dbAppRootCertificate().replace(/\\n/g, "\n"));

    AppConfig.ready = true;
    AppConfig.emit(AppConfig.READY_EVENT);
  });
} else {
  // emit something here
  AppConfig.ready = true;
}

module.exports = config;
