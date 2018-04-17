// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region
var configFile = process.env.RESOURCEROOT + "/aws_ses_config.json";
var params;

AWS.config.loadFromPath(configFile);

function createMessage(toEmail, subOrCur) {

    // Create sendEmail params
    if (subOrCur == "Sub") {
        params = {
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
                        Data: "<p>Thank you for submitting data to GOAT! Your submission has been received, and our curators will process it and get back to you.</p>"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "Thank you for submitting data to GOAT! Your submission has been received, and our curators will process it and get back to you."
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Successful Submission on GOAT'
                }
            },
            Source: 'arron.reed47@gmail.com', /* required */
            ReplyToAddresses: [],
        };
    } else if (subOrCur == "Cur") {
        params = {
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
                        Data: "<p>Your submission has been curated! Thank you again for submitting data to GOAT.</p>"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "Your submission has been curated! Thank you again for submitting data to GOAT."
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Successful Submission on GOAT'
                }
            },
            Source: 'arron.reed47@gmail.com', /* required */
            ReplyToAddresses: [],
        };
    }

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(
        function (data) {
            console.log(data.MessageId);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });

    console.log("Confirmation email sent");

}

module.exports = {
    createMessage
};