'use strict';

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const dynamoDB = new AWS.DynamoDB();

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 }  = require('uuid');

const detectFaces = async (s3Input) => {
  // see: https://docs.aws.amazon.com/ja_jp/rekognition/latest/dg/faces-detect-images.html
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: s3Input["Bucket"],
          Name: s3Input["Key"]
        }
      },
      Attributes: ['ALL']
    };
    const resp = await rekognition.detectFaces(params).promise();

    let results = [];
    for (let elem of resp.FaceDetails) {
      let face = {};
      face["BoundingBox"] = elem["BoundingBox"];
      face["Pose"] = elem["Pose"];
      face["Gender"] = elem["Gender"]["Value"];
      const c = elem["Emotions"].map(e => e["Confidence"]);
      face["Emotion"] = elem["Emotions"][c.indexOf(Math.max(...c))]["Type"];
      results.push(face);
    }
    return results;
  } catch (e) {
    console.error(e);
    throw e;
  }  
}

const downloadOriginalImage = async (s3Input) => {
  // 元画像のダウンロード
  const filename = path.join("/tmp", s3Input["Key"]);

  const promiseDownload = new Promise((resolve, reject) => {
    let writeStream = fs.createWriteStream(filename);
    let readStream =  s3.getObject(s3Input).createReadStream();
    writeStream.on('error', reject);
    readStream.on('error', reject);
    writeStream.on('close', () => {
      resolve(filename);
    });
    readStream.pipe(writeStream);
  });

  return promiseDownload;
}

const replaceFaces = async (filename, faceInfos) => {
  try {
    // 元画像のロード
    const input_image = sharp(filename);
    const {width, height} = await input_image.metadata();

    const memos = { "Male": {}, "Female": {} };
    const face_images = [];
    for (let info of faceInfos) {
      // 顔画像のロード
      let face = memos[info["Gender"]][info["Emotion"]];
      if(face == null) {
        face = sharp(`images/${info["Gender"]}/${info["Emotion"]}.png`);
        memos[info["Gender"]][info["Emotion"]] = face;
      }
      // 回転行列の計算
      const deg2rad = (deg) => deg/180.0 * Math.PI;
      const r = deg2rad(info["Pose"]["Roll"])
      const p = deg2rad(info["Pose"]["Pitch"])
      const y = deg2rad(info["Pose"]["Yaw"])
      const matrix = [
        [Math.cos(r) * Math.cos(p), Math.cos(r) * Math.sin(p) * Math.sin(y) - Math.sin(r) * Math.cos(y)],
        [Math.sin(r) * Math.cos(p), Math.sin(r) * Math.sin(p) * Math.sin(y) + Math.cos(r) * Math.cos(y)]
      ];
      // 元画像に結合するための情報を生成
      const fw = width * info["BoundingBox"]["Width"];
      const fh = height * info["BoundingBox"]["Height"];
      const buffer = await face
        .affine(matrix, { background: { r: 255, g: 255, b:255, alpha: 0} })
        .resize({
          width: Math.floor(fw * 1.2),
          height: Math.floor(fh * 1.2),
          fit: "fill",
          background: { r: 255, g: 255, b:255, alpha: 0}
        })
        .toBuffer();
      face_images.push({
        input: buffer,
        left: Math.floor(width * info["BoundingBox"]["Left"] - fw * 0.2),
        top: Math.floor(height * info["BoundingBox"]["Top"] - fh * 0.2)
      });
    }

    return input_image
      .composite(face_images)
      .jpeg({ quarlity: 100 })
      .toBuffer();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const uploadProcessedImage = async (bucket, key, tableName, imageBuffer) => {
  try {
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: imageBuffer
    }).promise();

    const itemParams = {
      TableName: tableName,
      Item: {
        'id': {S: uuidv4()},
        'createdAt': {S: new Date().toISOString()},
        'key': {S: key}
      }
    };
    const result = await dynamoDB.putItem(itemParams).promise();
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

module.exports = { detectFaces, downloadOriginalImage, replaceFaces, uploadProcessedImage };