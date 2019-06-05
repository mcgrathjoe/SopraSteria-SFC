const express = require('express');
const appConfig = require('../../config/config');
const AWS = require('aws-sdk');
const fs = require('fs');
const csv = require('csvtojson');

const router = express.Router();
const s3 = new AWS.S3({
  accessKeyId: appConfig.get('bulkuploaduser.accessKeyId').toString(),
  secretAccessKey: appConfig.get('bulkuploaduser.secretAccessKey').toString(),
  region: appConfig.get('bulkuploaduser.region').toString(),
});

const CsvEstablishmentValidator = require('../../models/BulkImport/csv/establishments').Establishment;
const CsvWorkerValidator = require('../../models/BulkImport/csv/workers').Worker;
const CsvTrainingValidator = require('../../models/BulkImport/csv/training').Training;
const MetaData = require('../../models/BulkImport/csv/metaData').MetaData;

var FileStatusEnum = { "Latest": "latest", "Validated": "validated", "Imported": "imported" };
var FileValidationStatusEnum = { "Pending": "pending", "Validating": "validating", "Pass": "pass", "PassWithWarnings": "pass with warnings", "Fail": "fail" };

router.route('/signedUrl').get(async function (req, res) {
  const establishmentId = req.establishmentId;
  const username = req.username;

  try {
    const myEstablishmentId = Number.isInteger(establishmentId) ? establishmentId.toString() : establishmentId;
    var uploadPreSignedUrl = s3.getSignedUrl('putObject', {
      Bucket: appConfig.get('bulkuploaduser.bucketname').toString(),
      Key: establishmentId + '/' + FileStatusEnum.Latest + '/' + req.query.filename,
      // ACL: 'public-read',
      ContentType: req.query.type,
      Metadata: {
        username,
        establishmentId: myEstablishmentId,
        validationstatus: FileValidationStatusEnum.Pending,
      },
      Expires: appConfig.get('bulkuploaduser.uploadSignedUrlExpire'),
    });
    res.json({ urls: uploadPreSignedUrl });
    res.end();
  }
  catch (err) {
    console.error('establishment::bulkupload GET/:PreSigned - failed', err.message);
    return res.status(503).send();
  }
});

// Happy path
//Concern in download files to local folder; if many user download, or we stream 
//User case0; create 3 files with known sample data for establishment, worker
//Use case 1: Accept three filenames and make a key default to New
//Use case 2: First validation, must be three filename, unless do revalidation
//User case3: in case of fail or re validation, always run full on 3 files.
//Use case4: search new in s3 and retrieve file
//Use case 5: run validation on schema or pattern to make sure they are indeed establishment, worker and trainning csv
//Use case 6: field mapping
//Use case7: BUDI mapping
//user case7: LI mapping
//Use case8 : make an api call
//user case9: return list of error


// FOR NASIR:
//  2. If using a POST or PATCH, can pass data as JSON BODY
//  7. This current approach to validation is "very synchronous"; there is lots we can do yet to optimise this - but we optimise later once we have the process working.
router.route('/validate').put(async (req, res) => {
  const establishmentId = req.establishmentId;
  const username = req.username;
  const myDownloads = {};
  const establishmentMetadata = new MetaData();
  const workerMetadata = new MetaData();
  const trainingMetadata = new MetaData();
  
  try {
    // awaits must be within a try/catch block - checking if file exists - saves having to repeatedly download from S3 bucket
    const params = {
      Bucket: appConfig.get('bulkuploaduser.bucketname').toString(), 
      Prefix: `${req.establishmentId}/latest/`
    };
    const data = await s3.listObjects(params).promise();
    //  const establishmentsCSV = null;

    const establishmentRegex = /LOCALESTID,STATUS,ESTNAME,ADDRESS1,ADDRESS2,ADDRES/;
    const workerRegex = /LOCALESTID,UNIQUEWORKERID,CHGUNIQUEWRKID,STATUS,DI/;
    const trainingRegex = /LOCALESTID,UNIQUEWORKERID,CATEGORY,DESCRIPTION,DAT/;
    const createModelPromises = [];

    data.Contents.forEach(myFile => {
      createModelPromises.push(  downloadContent(myFile.Key) );
    });
    
    await Promise.all(createModelPromises).then(function(values){
       values.forEach(myfile=>{
          if (establishmentRegex.test(myfile.data.substring(0,50))) {
            myDownloads.establishments = myfile.data;
            establishmentMetadata.filename = myfile.filename;
            establishmentMetadata.fileType = 'Establishment';
            
                          
          } else if (workerRegex.test(myfile.data.substring(0,50))) {
            myDownloads.workers = myfile.data;
            workerMetadata.filename = myfile.filename;
            workerMetadata.fileType = 'Worker';    

          } else if (trainingRegex.test(myfile.data.substring(0,50))) {
            myDownloads.trainings = myfile.data;
            trainingMetadata.filename = myfile.filename;
            trainingMetadata.fileType = 'Training';
          }        
        })
    }).catch(err => {
        console.error("NM: validate.put", err);
    }) ;
  
    const importedEstablishments = myDownloads.establishments ? await csv().fromString(myDownloads.establishments) : null;
    const importedWorkers = myDownloads.workers ? await csv().fromString(myDownloads.workers) :  null;
    const importedTraining = myDownloads.trainings ? await csv().fromString(myDownloads.trainings) : null;

    const validationResponse = await validateBulkUploadFiles(
      true,
      username,
      establishmentId,
      { imported: importedEstablishments, establishmentMetadata: establishmentMetadata  },
      { imported: importedWorkers, workerMetadata: workerMetadata },
      { imported: importedTraining, trainingMetadata: trainingMetadata })

      // handle parsing errors
      if (!validationResponse.status) {
        return res.status(400).send({
          establishment: validationResponse.metaData.establishments.toJSON(),
          workers: validationResponse.metaData.workers.toJSON(),
          training: validationResponse.metaData.training.toJSON(),
        });
  
      } else {
        return res.status(200).send({
          establishment: validationResponse.metaData.establishments.toJSON(),
          workers: validationResponse.metaData.workers.toJSON(),
          training: validationResponse.metaData.training.toJSON(),
        });
      }

  } catch (err) {
      console.error(err);
      return res.status(503).send({});
  }
});

// alternative (testable) route, which passes the establishment, worker and training CSV as content
//  return the validation errors as response
router.route('/validate').post(async (req, res) => {
  const establishmentId = req.establishmentId;
  const username = req.username;
  const establishmentMetadata = new metaData();
  const workerMetadata = new metaData();
  const trainingMetadata = new metaData();

  const establishmentRegex = /LOCALESTID,STATUS,ESTNAME,ADDRESS1,ADDRESS2,ADDRES/;
  const workerRegex = /LOCALESTID,UNIQUEWORKERID,CHGUNIQUEWRKID,STATUS,DI/;
  const trainingRegex = /LOCALESTID,UNIQUEWORKERID,CATEGORY,DESCRIPTION,DAT/;
  const filenameRegex=/^(.+\/)*(.+)\.(.+)$/;

  try {
    const importedEstablishments = await csv().fromString(req.body.establishments.csv);
    const importedWorkers = await csv().fromString(req.body.workers.csv);
    const importedTraining = await csv().fromString(req.body.training.csv);

    if (establishmentRegex.test(req.body.establishments.csv.substring(0,50))) {
      let key = req.body.establishments.filename;
      establishmentMetadata.filename = key.match(filenameRegex)[2]+ '.' + key.match(filenameRegex)[3];
      establishmentMetadata.fileType = 'Establishment';
                   
    } 
    if (workerRegex.test(req.body.workers.csv.substring(0,50))) {
      let key = req.body.workers.filename;
      workerMetadata.filename = key.match(filenameRegex)[2]+ '.' + key.match(filenameRegex)[3];
      workerMetadata.fileType = 'Worker';    

    } 
    
    if (trainingRegex.test(req.body.training.csv.substring(0,50))) {
      let key = req.body.training.filename;
      trainingMetadata.filename = key.match(filenameRegex)[2]+ '.' + key.match(filenameRegex)[3];
      trainingMetadata.fileType = 'Training';
    }        

    const validationResponse = await validateBulkUploadFiles(
      false,
      username,
      establishmentId,
      { imported: importedEstablishments, establishmentMetadata: establishmentMetadata  },
      { imported: importedWorkers, workerMetadata: workerMetadata },
      { imported: importedTraining, trainingMetadata: trainingMetadata })

    // handle parsing errors
    if (!validationResponse.status) {
      return res.status(400).send({
        establishment: validationResponse.validation.establishments,
        workers: validationResponse.validation.workers,
        training: validationResponse.validation.training,
      });

    } else {
      return res.status(200).send({
        establishment: validationResponse.data.establishments,
        workers: validationResponse.data.workers,
        training: validationResponse.data.training,
      });
    }

  } catch (err) {
      console.error(err);
      return res.status(503).send({});
  }
});

async function downloadContent(key) {
    var params = {
      Bucket: appConfig.get('bulkuploaduser.bucketname').toString(),
      Key: key,
    };
    
    const filenameRegex=/^(.+\/)*(.+)\.(.+)$/; 
    
    try {
      const objData = await s3.getObject(params).promise();      
      return {
        data: objData.Body.toString(), 
        filename: key.match(filenameRegex)[2]+ '.' + key.match(filenameRegex)[3],
     };

    } catch (err) {
      console.error('api/establishment/bulkupload/downloadFile: ', err);
      throw new Error(`Failed to download S3 object: ${key}`);
    }
}

async function uploadAsJSON(username, establishmentId, content, key) {
  const myEstablishmentId = Number.isInteger(establishmentId) ? establishmentId.toString() : establishmentId;

  var params = {
    Bucket: appConfig.get('bulkuploaduser.bucketname').toString(),
    Key: key,
    Body: JSON.stringify(content, null, 2),
    ContentType: 'application/json',
    Metadata: {
      username,
      establishmentId : myEstablishmentId,
    },
  };

  try {
    const objData = await s3.putObject(params).promise();
    console.log(`${key} has been uploaded!`, objData);

  } catch (err) {
    console.error('api/establishment/bulkupload/uploadFile: ', err);
    throw new Error(`Failed to upload S3 object: ${key}`);
  }
}

// if commit is false, then the results of validation are not uploaded to S3
const validateBulkUploadFiles = async (commit, username , establishmentId, establishments, workers, training) => {
  let status = true;
  const csvEstablishmentSchemaErrors = [], csvWorkerSchemaErrors = [], csvTrainingSchemaErrors = [];
  const myEstablishments = [], myWorkers = [], myTrainings = [];
  
  let establishmentRecords=0;
  let workerRecords=0;
  let trainingRecords=0;
 
  // parse and process Establishments CSV
  if (Array.isArray(establishments.imported) && establishments.imported.length > 0 && establishments.establishmentMetadata.fileType == "Establishment") {
    establishments.imported.forEach((thisLine, currentLineNumber) => {
      const lineValidator = new CsvEstablishmentValidator(thisLine, currentLineNumber+2);   // +2 because the first row is CSV headers, and forEach counter is zero index
      
      ++establishmentRecords;

      // the parsing/validation needs to be forgiving in that it needs to return as many errors in one pass as possible
      lineValidator.validate();
      lineValidator.transform();

      // TODO - not sure this is necessary yet - we can just iterate the collection of Establishments at the end to create the validation JSON document
      if (lineValidator.validationErrors.length > 0) {
        csvEstablishmentSchemaErrors.push(lineValidator.validationErrors);  
        establishments.establishmentMetadata.errors += lineValidator.validationErrors.length;    
      }

      myEstablishments.push(lineValidator);

      //console.log("WA DEBUG - this establishment: ", lineValidator.toJSON());
    });
  } else {
    console.error("No establishments");
    status = false;
  }
  establishments.establishmentMetadata.records = establishmentRecords;

  // parse and process Workers CSV
  if (Array.isArray(workers.imported) && workers.imported.length > 0 && workers.workerMetadata.fileType == "Worker") {
    workers.imported.forEach((thisLine, currentLineNumber) => {
      const lineValidator = new CsvWorkerValidator(thisLine, currentLineNumber+2);   // +2 because the first row is CSV headers, and forEach counter is zero index

      ++workerRecords;

      // the parsing/validation needs to be forgiving in that it needs to return as many errors in one pass as possible
      lineValidator.validate();
      lineValidator.transform();

      if (lineValidator.validationErrors.length > 0) {
        csvWorkerSchemaErrors.push(lineValidator.validationErrors);
        workers.workerMetadata.errors += lineValidator.validationErrors.length;    
      }

      //console.log("WA DEBUG - this worker: ", lineValidator.toJSON());
      myWorkers.push(lineValidator);
    });
  } else {
    console.error("No Workers");
    status = false;
  }
  workers.workerMetadata.records = workerRecords;

  // parse and process Training CSV
  if (Array.isArray(training.imported) && training.imported.length > 0 && training.trainingMetadata.fileType == "Training") {
    training.imported.forEach((thisLine, currentLineNumber) => {
      const lineValidator = new CsvTrainingValidator(thisLine, currentLineNumber+2);   // +2 because the first row is CSV headers, and forEach counter is zero index

      ++trainingRecords;
      // the parsing/validation needs to be forgiving in that it needs to return as many errors in one pass as possible
      lineValidator.validate();
      lineValidator.transform();

      if (lineValidator.validationErrors.length > 0) {
        csvTrainingSchemaErrors.push(lineValidator.validationErrors);
        training.trainingMetadata.errors += lineValidator.validationErrors.length;  
      }

      //console.log("WA DEBUG - this training: ", lineValidator.toJSON());
      myTrainings.push(lineValidator);
    });
  } else {
      console.error("No training records");
      status = false;
  }
  training.trainingMetadata.records = trainingRecords;

  // TODO: we have still got to transform/load the establishments, workers/qualifications and training records through the API (model classes yet)
  //       which may yet incur more validation errors - but that is a separate ticket.

  // upload the converted CSV as JSON to S3
  myEstablishments.length > 0 && commit ? await uploadAsJSON(username, establishmentId, myEstablishments.map(thisEstablishment => thisEstablishment.toJSON()), `${establishmentId}/intermediary/${establishments.establishmentMetadata.filename}.validation.json`) : true;
  myWorkers.length > 0 && commit ? await uploadAsJSON(username, establishmentId, myWorkers.map(thisEstablishment => thisEstablishment.toJSON()), `${establishmentId}/intermediary/${workers.workerMetadata.filename}.validation.json`) : true;
  myTrainings.length > 0 && commit ? await uploadAsJSON(username, establishmentId, myTrainings.map(thisEstablishment => thisEstablishment.toJSON()), `${establishmentId}/intermediary/${training.trainingMetadata.filename}.validation.json`) : true;
  
  // handle parsing errors
  if (csvEstablishmentSchemaErrors.length > 0 || csvWorkerSchemaErrors.length > 0 || csvTrainingSchemaErrors.length > 0) {
    //console.error('WA DEBUG Establishment validation errors: ', csvEstablishmentSchemaErrors)
    //console.error('NM DEBUG Worker validation errors: ', csvWorkerSchemaErrors)
    //console.error('NM DEBUG Training validation errors: ', csvTrainingSchemaErrors)

    // upload the validation to S3
    commit ? await uploadAsJSON(username, establishmentId, csvEstablishmentSchemaErrors, `${establishmentId}/validation/${establishments.establishmentMetadata.filename}.validation.json`) : true;
    commit ? await uploadAsJSON(username, establishmentId, csvWorkerSchemaErrors, `${establishmentId}/validation/${workers.workerMetadata.filename}.validation.json`) : true;
    commit ? await uploadAsJSON(username, establishmentId, csvTrainingSchemaErrors, `${establishmentId}/validation/${training.trainingMetadata.filename}.validation.json`) : true;

    status = false;
  }

   //upload metadata as json, by filename+metadata.json
   commit ? await uploadAsJSON(username, establishmentId, establishments.establishmentMetadata, `${establishmentId}/latest/${establishments.establishmentMetadata.filename}.metadata.json`) : true;
   commit ? await uploadAsJSON(username, establishmentId, workers.workerMetadata, `${establishmentId}/latest/${workers.workerMetadata.filename}.metadata.json`) : true;
   commit ? await uploadAsJSON(username, establishmentId, training.trainingMetadata, `${establishmentId}/latest/${training.trainingMetadata.filename}.metadata.json`) : true;

  return {
    status,
    validation: {
      establishments: csvEstablishmentSchemaErrors,
      workers: csvWorkerSchemaErrors,
      training: csvTrainingSchemaErrors,
    },
    data: {
      establishments: myEstablishments.map(thisEstablishment => thisEstablishment.toJSON()),
      workers: myEstablishments.map(thisEstablishment => thisEstablishment.toJSON()),
      training: myEstablishments.map(thisEstablishment => thisEstablishment.toJSON()),
    },
    metaData: {
        establishments: establishments.establishmentMetadata,
        workers: workers.workerMetadata,      
        training: training.trainingMetadata
    }
  }
};


router.route('/').get(async (req, res) => {
  const establishmentId = req.establishmentId;
  console.log('ok - bulk', establishmentId);
  return res.status(501).send({});
});

module.exports = router;