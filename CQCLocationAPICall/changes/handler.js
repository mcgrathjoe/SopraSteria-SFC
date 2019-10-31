const AWS = require('aws-sdk');
const appConfig = require('../config/config');
const axios = require('axios');
const axiosRetry = require('axios-retry');
const models = require('../models/index');

//CQC Endpoint
const url = 'https://api.cqc.org.uk/public/v1';
axiosRetry(axios, { retries: 3 });

const s3 = new AWS.S3({
  region: appConfig.get('aws.region').toString()
});

const sqs = new AWS.SQS({
  region: appConfig.get('aws.region').toString()
});

// Get a list of all the CQC Location ID's that jhave changed between 2 timestamps
async function getChangedIds(startTimestamp, endTimestamp) {
  let changes = [];
  let nextPage='/changes/location?page=1&perPage=1000&startTimestamp=' + startTimestamp + '&endTimestamp=' + endTimestamp;
  do {
    let changeUrl = url + nextPage;
    let response = await axios.get(changeUrl);
    nextPage = response.data.nextPageUri;

    for (let i=0, len=response.data.changes.length; i<len; i++) {
      changes.push({
        "locationId": response.data.changes[i],
        "status": ""
      });
    }
  } while (nextPage != null);
  return changes;
}

// Upload a list of all the changed location ID's along with timings to S3
async function uploadToS3(locationIds, startdate, enddate) {
  const locations ={
    "changes": locationIds,
    "startDate": startdate,
    "endDate": enddate
  };

  await s3.putObject({
    Bucket: appConfig.get('aws.bucketname').toString(),
    Key: `cqcChanges-${enddate}`,
    Body: JSON.stringify(locations),
    ContentType: 'application/json; charset=utf-8'
  }).promise();
}

// Send each of the location ID's to SQS for them to run a SQS
async function sendMessages(locationIds, startdate, enddate) {
  await locationIds.forEach(async (locationId) => {
    const location = {
      ...locationId,
      "startDate": startdate,
      "endDate": enddate
    };
    await sqs.sendMessage({
      MessageBody: JSON.stringify(location),
      QueueUrl: appConfig.get('aws.sqsqueue').toString(),
    }).promise();
  });
}

module.exports.handler =  async (event, context) => {
  const endDate=new Date().toISOString().split('.')[0]+"Z";
  let startDate = null;
  try {
    const log = await models.cqclog.findAll({
      limit: 1,
      where: {
        success:true
      },
      order: [ [ 'createdat', 'DESC' ]]
    });
    if (log) {
      startDate = log[0].dataValues.lastUpdatedAt;
    }
    const locations = await getChangedIds(startDate, endDate);
    await uploadToS3(locations, startDate, endDate);
    await sendMessages(locations, startDate, endDate);
    models.sequelize.close();

    return {
      status: 200,
      body: "Call Successful"
    };
  } catch (error) {
    return  error.message;
  }
};
