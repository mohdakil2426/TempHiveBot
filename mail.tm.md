Temp Mail API
API for creating temporary email accounts

Welcome to the Mail.tm API documentation.

This API allows you to automate the registration process at the various sites which do require email confirmation for testing purposes.

Usage of our API for illegal activity is strictly prohibited.
It is forbidden to sell programs and/or earn from it that exclusively uses our API (for example, creating a competing temp mail client and charging for it's usage is not allowed).
Creating a mirror proxy service that explicitly utilizes our API is not allowed (for example, creating a proxy service under another domain name and then returning the results of the API).
If you are developing an wrapper and/or application that utilizes our API, you are required to explicitly mention that you are using Mail.tm by including a link to our main site as this would appreacited and make our service more popular.
Access to the API
Available completely free of charge and without restriction.

The general quota limit is 8 queries per second (QPS) per IP address.
Keep in mind that no API keys are required to use our service.
How it works
Fetch our domain names.
Create a new account by using our domain names.
Sign up only on sites that you have acquired permission to.
The site sends an email message to the address you specify.
A message comes to our SMTP server, processed and added to the database.
You make a request to the API to fetch the message list.
That's it.
General information
The Mail.tm API specification documentation is written using the OpenAPI Specification v3.

You can download the file here and test it here.

Integrations
Language	Link
.NET	https://github.com/SmorcIRL/mail.tm
Dart	https://pub.dev/packages/mailtm_client
Golang	https://github.com/felixstrobel/mailtm, https://github.com/msuny-c/mailtm
Java	https://github.com/shivam1608/JMailTM
JavaScript	https://github.com/cemalgnlts/Mailjs
PHP	https://github.com/heithemmoumni/mail.tm
Python	https://github.com/CarloDePieri/pymailtm, https://github.com/prtolem/MailTM, https://github.com/RPwnage/MailTMClient
Rust	https://github.com/AwesomeIbex/mail-tm-rs
Swift	https://github.com/devwaseem/MailTMSwift
We would appreciate any legal integrations to make usage of our service, please let us know to be added to the list.

API Documentation
Base url: https://api.mail.tm

Error handling
Successful
Generally, the request is successful when the response code is 200, 201 or 204 (You could also check if the code is between 200 and 204)

Unsuccessful
Usually, when the request has an error the code is between 400 and 430.

Bad request 400: Something in your payload is missing! Or, the payload isn't there at all.

Unauthorized 401: Your token isn't correct (Or the headers hasn't a token at all!). Remember, every request (Except POST /accounts and POST /token) should be authenticated with a Bearer token!

Not found 404: You're trying to access an account that doesn't exist? Or maybe reading a non-existing message? Go check that!

Method not allowed 405: Maybe you're trying to GET a /token or POST a /messages. Check the path you're trying to make a request to and check if the method is the correct one.

I'm a teapot 418: Who knows? Maybe the server becomes a teapot!

Unprocessable entity 422: Some went wrong on your payload. Like, the username of the address while creating the account isn't long enough, or, the account's domain isn't correct. Things like that.

Too many requests 429: You exceeded the limit of 8 requests per second! Try delaying the request by one second!

Authentication
To make any request (Except for account creation and /domains requests) you need to authenticate the request with a bearer token.

How to get it?

You need to make a POST request to the /token path.

Body

Name	Type	Description
address	string	Account's address. Example: user@example.com
password	string	Account's password.
Params

None

Response

{
  "id": "string",
  "token":"string"
}
Use this token as

"Authorization":"Bearer TOKEN"
In every request!

Remember: You should first create the account and then get the token!***
Domain
GET /domains
You have to use this when creating an account, to retrieve the domain. Returns a list of domains

Body

None

Params

Name	Type	Description
page	int	The collection page number
Response

{
  "hydra:member": [
    {
      "@id": "string",
      "@type": "string",
      "@context": "string",
      "id": "string",
      "domain": "string",
      "isActive": true,
      "isPrivate": true,
      "createdAt": "2022-04-01T00:00:00.000Z",
      "updatedAt": "2022-04-01T00:00:00.000Z"
    }
  ],
  "hydra:totalItems": 0,
  "hydra:view": {
    "@id": "string",
    "@type": "string",
    "hydra:first": "string",
    "hydra:last": "string",
    "hydra:previous": "string",
    "hydra:next": "string"
  },
  "hydra:search": {
    "@type": "string",
    "hydra:template": "string",
    "hydra:variableRepresentation": "string",
    "hydra:mapping": [
      {
        "@type": "string",
        "variable": "string",
        "property": "string",
        "required": true
      }
    ]
  }
}
When you create an email, you have to know first which domain to use.

You'll need to retrieve the domain, and then, do like so:

"user@"+domains[0]['domain']
There are up to 30 domains per page, to check the total number, retrieve it from "hydra:totalItems"

GET /domains/{id}
Retrieve a domain by its id (Useful for deleted/private domains)

Body

None

Params

Name	Type	Description
id	string	The domain you want to get with id
Response

{
  "@id": "string",
  "@type": "string",
  "@context": "string",
  "id": "string",
  "domain": "string",
  "isActive": true,
  "isPrivate": true,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
Account
POST /accounts
Creates an Account resource (Registration)

Body

Name	Type	Description
address	string	Account's address. Example: user@example.com
password	string	Account's password.
Params

None

Response

{
  "@context": "string",
  "@id": "string",
  "@type": "string",
  "id": "string",
  "address": "user@example.com",
  "quota": 0,
  "used": 0,
  "isDisabled": true,
  "isDeleted": true,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
At this point, you could now get the token and do all the cool stuff you want to do.

GET /accounts/{id}
Get an Account resource by its id (Obviously, the Bearer token needs to be the one of the account you are trying to retrieve)

Body

None

Params

Name	Type	Description
id	string	The message you want to gets id
Response

{
  "@context": "string",
  "@id": "string",
  "@type": "string",
  "id": "string",
  "address": "user@example.com",
  "quota": 0,
  "used": 0,
  "isDisabled": true,
  "isDeleted": true,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
Can we improve this? Yes No

DELETE /accounts/{id}
Deletes the Account resource.
Be careful! We can't restore your account, if you use this method, bye bye dear account :c

Body

None

Params

Name	Type	Description
id	string	The account you want to delete by id
Response

None (Returns status code 204 if successful.)

Can we improve this? Yes No

GET /me
Returns the Account resource that matches the Bearer token that sent the request.

Body

None

Params

None

Response

{
  "@context": "string",
  "@id": "string",
  "@type": "string",
  "id": "string",
  "address": "user@example.com",
  "quota": 0,
  "used": 0,
  "isDisabled": true,
  "isDeleted": true,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
Messages
GET /messages
Gets all the Message resources of a given page.

Body

None

Params

Name	Type	Description
page	int	The collection page number
Response

{
  "hydra:member": [
    {
      "@id": "string",
      "@type": "string",
      "@context": "string",
      "id": "string",
      "accountId": "string",
      "msgid": "string",
      "from": {
          "name": "string",
          "address": "string"
      },
      "to": [
        {
            "name": "string",
            "address": "string"
        }
      ],
      "subject": "string",
      "intro": "string",
      "seen": true,
      "isDeleted": true,
      "hasAttachments": true,
      "size": 0,
      "downloadUrl": "string",
      "createdAt": "2022-04-01T00:00:00.000Z",
      "updatedAt": "2022-04-01T00:00:00.000Z"
    }
  ],
  "hydra:totalItems": 0,
  "hydra:view": {
    "@id": "string",
    "@type": "string",
    "hydra:first": "string",
    "hydra:last": "string",
    "hydra:previous": "string",
    "hydra:next": "string"
  },
  "hydra:search": {
    "@type": "string",
    "hydra:template": "string",
    "hydra:variableRepresentation": "string",
    "hydra:mapping": [
      {
        "@type": "string",
        "variable": "string",
        "property": "string",
        "required": true
      }
    ]
  }
}
There are up to 30 messages per page, to check the total number, retrieve it from "hydra:totalItems"

GET /messages/{id}
Retrieves a Message resource with a specific id (It has way more information than a message retrieved with GET /messages but it hasn't the "intro" member)

Body

None

Params

Name	Type	Description
id	string	The message you want to get by id
Response

{
  "@context": "string",
  "@id": "string",
  "@type": "string",
  "id": "string",
  "accountId": "string",
  "msgid": "string",
    "from": {
        "name": "string",
      "address": "string"
  },
  "to": [
        {
            "name": "string",
            "address": "string"
        }
    ],
  "cc": [
    "string"
  ],
  "bcc": [
    "string"
  ],
  "subject": "string",
  "seen": true,
  "flagged": true,
  "isDeleted": true,
  "verifications": [
    "string"
  ],
  "retention": true,
  "retentionDate": "2022-04-01T00:00:00.000Z",
  "text": "string",
  "html": [
    "string"
  ],
  "hasAttachments": true,
  "attachments": [
    {
      "id": "string",
      "filename": "string",
      "contentType": "string",
      "disposition": "string",
      "transferEncoding": "string",
      "related": true,
      "size": 0,
      "downloadUrl": "string"
    }
  ],
  "size": 0,
  "downloadUrl": "string",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
DELETE /messages/{id}
Deletes the Message resource.

Body

None

Params

Name	Type	Description
id	string	The message you want to delete's id
Response

None (Returns status code 204 if successful.)

PATCH /messages/{id}
Marks a Message resource as read!

Body

None

Params

Name	Type	Description
id	string	The message you want to read's id
Response

{
  "seen": true
}
To check if the message has been read, you could also check if the status code is 200!

GET /sources/{id}
Gets a Message's Source resource (If you don't know what this is, you either don't really want to use it or you should read this!)

Body

None

Params

Name	Type	Description
id	string	The source you want to get by id
Response

{
  "@context": "string",
  "@id": "string",
  "@type": "string",
  "id": "string",
  "downloadUrl": "string",
  "data": "string"
}
You don't really need the downloadUrl if you already have the "data" String. It will simply download that data.

Attachments
Message's attachments need to be handled in a certain way. When you download them, be sure to download them in the right encoding (For example, a .exe file will need to be downloaded as an array of integers, but a json will need to be downloaded as String! Also, remember: API are friends. contentType member can help you know how to decode the file)

Webhooks
You might be interested in Webhooks to receive notifications when a new message is received. However, we don't utilize them in this project.

Instead, we're using the Mercure to send SSE events.

Listen to messages
To listen to messages you'll need a different base url.

Base url: https://mercure.mail.tm/.well-known/mercure
Topic: /accounts/{id}
Remember! You must use the `Bearer TOKEN` authorization in the headers!
For each listened message, there will be an Account event. That Account is the Account resource that received the message, with updated "used" property.

Questions and suggestions
If you have any questions or suggestions, please contact us via email support@mail.tm.

Tech stack
Our stack includes API-Platform, Mercure, Nuxt.js, Haraka, Caddy, MongoDB, Node.js, CentOS