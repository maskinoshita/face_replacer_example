'use strict';

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamoDB = new AWS.DynamoDB();

module.exports.query = async (event) => {
  const tableName = process.env.item_list_table;
  const websiteOrigin = process.env.website_origin;
  const responseHeaders = {
    'Access-Control-Allow-Origin': websiteOrigin,
    'Access-Control-Allow-Credentials': true,
  };
  try {
    const from = event.queryStringParameters["from"];
    const params = {
      FilterExpression: "createdAt >= :from",
      ExpressionAttributeValues: {
        ":from": {S: from},
      },
      ExpressionAttributeNames: {
        "#k" : "key"
      },
      ProjectionExpression: "#k",
      TableName: tableName
    };
    const data = await dynamoDB.scan(params).promise();
    const items = data.Items.map((elem) => elem["key"]["S"]).filter((value, index, self) => self.indexOf(value) === index);
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
          items: items
      }),
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({
        error: e.toString(),
        input: event
      }, null, 2)
    };
  }
};