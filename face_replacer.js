'use strict';

const AWSXRay = require('aws-xray-sdk');
const path = require('path');

const {
   detectFaces,
   downloadOriginalImage,
   replaceFaces,
   uploadProcessedImage
} = require('face_replacer_util.js');

module.exports.face_replacer = async (event) => {
  try {
    const s3Input = {
      Bucket: event["Records"][0]["s3"]["bucket"]["name"],
      Key: event["Records"][0]["s3"]["object"]["key"]
    };

    const segment = AWSXRay.getSegment();
    const wrapSubseg = async (name, func) => {
      const subsegment = segment.addNewSubsegment(name);
      try {
        let result = await func();
        subsegment.close();
        return result;
      } catch (error) {
        subsegment.close(error);
        throw error;
      }
    };

    const faceInfos = await wrapSubseg('detectFaces',
      async () => detectFaces(s3Input));
    const filename = await wrapSubseg('downloadOriginalImage',
      async ()=> downloadOriginalImage(s3Input));
    const imageBuffer = await wrapSubseg('replaceFaces',
      async () => replaceFaces(filename, faceInfos));

    const bucket = process.env.processed_bucket;
    const tableName = process.env.item_list_table;
    const result = await wrapSubseg('uploadProcessedImage',
      async () => uploadProcessedImage(bucket, path.basename(filename), tableName, imageBuffer));
    
    console.log(`Successfully replaced faces: ${filename}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
          message: `Successfully replaced faces: ${filename}`,
          input: event
        }, null, 2)
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: e,
        input: event
      }, null, 2)
    };
  }
};
