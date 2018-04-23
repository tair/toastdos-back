// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region
var configFile = process.env.RESOURCEROOT + "/aws_ses_config.json";

AWS.config.loadFromPath(configFile);

function createSubMessage(toEmail, paper) {
    if (toEmail != "" && toEmail != null) {
        let params = {
            Destination: { /* required */
                CcAddresses: [],
                ToAddresses: [
                    toEmail
                ]
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: "<p>Success! Your annotations for " + paper + " have been submitted for review. Once they are approved, you will be notified. If we have any questions, we will contact you.</p><p>Sincerely,</p><p>Phoenix Bioinformatics</p>"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "Success! Your annotations for " + paper + " have been submitted for review. Once they are approved, you will be notified. If we have any questions, we will contact you. Sincerely, Phoenix Bioinformatics"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Successful Submission on GOAT'
                }
            },
            Source: 'curator@phoenixbioinformatics.org', /* required */
            ReplyToAddresses: [],
        };
        sendWithParams(params);
    }
}

function createCurMessage(toEmail, paper) {
    if (toEmail != "" && toEmail != null) {
        let params = {
            Destination: { /* required */
                CcAddresses: [],
                ToAddresses: [
                    toEmail
                ]
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: "<p>Congratulations, your annotations for " + paper + " have been approved! They are now included in the data download files which are accessible to users via the 'Download Data' section of our website. </p><p>Thank you for your contributions. </p><p>Sincerely, </p><p>Phoenix Bioinformatics.</p>"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "Congratulations, your annotations for " + paper + " have been approved! They are now included in the data download files which are accessible to users via the 'Download Data' section of our website. Thank you for your contributions. Sincerely, Phoenix Bioinformatics"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Successful Curation on GOAT'
                }
            },
            Source: 'curator@phoenixbioinformatics.org', /* required */
            ReplyToAddresses: [],
        };
        sendWithParams(params);
    }
}

function sendWithParams(params) {
    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: '2012-10-17' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(
        function (data) {
            console.log(data.MessageId);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}

module.exports = {
    createSubMessage,
    createCurMessage
};