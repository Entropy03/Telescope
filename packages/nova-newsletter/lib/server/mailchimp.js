import Email from 'meteor/nova:email';
import Campaign from "./campaign.js";

Campaign.scheduleNextWithMailChimp = function (isTest) {
  isTest = !! isTest;
  var posts = Campaign.getPosts(Telescope.Telescope.settings.get('postsPerNewsletter', defaultPosts));
  if(!!posts.length){
    return Campaign.scheduleWithMailChimp(Campaign.build(posts), isTest);
  }else{
    var result = 'No posts to schedule today…';
    return result;
  }
};

var htmlToText = Npm.require('html-to-text');

Campaign.scheduleWithMailChimp = function (campaign, isTest) {
  isTest = typeof isTest === 'undefined' ? false : isTest;

  var apiKey = Telescope.settings.get('mailChimpAPIKey');
  var listId = Telescope.settings.get('mailChimpListId');

  if(!!apiKey && !!listId){

    var wordCount = 15;
    var subject = campaign.subject;
    while (subject.length >= 150){
      subject = Telescope.utils.trimWords(subject, wordCount);
      wordCount--;
    }

    try {

      var api = new MailChimp(apiKey);
      var text = htmlToText.fromString(campaign.html, {wordwrap: 130});
      var defaultEmail = Telescope.settings.get('defaultEmail');
      var campaignOptions = {
        type: 'regular',
        options: {
          list_id: listId,
          subject: subject,
          from_email: defaultEmail,
          from_name: Telescope.settings.get('title')+ ' Top Posts',
        },
        content: {
          html: campaign.html,
          text: text
        }
      };

      console.log( '// Creating campaign…');

      // create campaign
      var mailchimpCampaign = api.call( 'campaigns', 'create', campaignOptions);

      console.log( '// Campaign created');
      // console.log(campaign)

      var scheduledTime = moment().utcOffset(0).add(1, 'hours').format("YYYY-MM-DD HH:mm:ss");

      var scheduleOptions = {
        cid: mailchimpCampaign.id,
        schedule_time: scheduledTime
      };

      // schedule campaign
      var schedule = api.call('campaigns', 'schedule', scheduleOptions);

      console.log('// Campaign scheduled for '+scheduledTime);
      // console.log(schedule)

      // if this is not a test, mark posts as sent
      if (!isTest)
        var updated = Posts.update({_id: {$in: campaign.postIds}}, {$set: {scheduledAt: new Date()}}, {multi: true})

      // send confirmation email
      var confirmationHtml = Email.getTemplate('digestConfirmation')({
        time: scheduledTime,
        newsletterLink: mailchimpCampaign.archive_url,
        subject: subject
      });
      Email.send(defaultEmail, 'Newsletter scheduled', Email.buildTemplate(confirmationHtml));

    } catch (error) {
      console.log(error);
    }
    return subject;
  }
};

const addToMailChimpList = function(userOrEmail, confirm, done){

  var user, email;

  var confirm = (typeof confirm === 'undefined') ? false : confirm; // default to no confirmation

  // not sure if it's really necessary that the function take both user and email?
  if (typeof userOrEmail === "string") {
    user = null;
    email = userOrEmail;
  } else if (typeof userOrEmail === "object") {
    user = userOrEmail;
    email = Users.getEmail(user);
    if (!email)
      throw 'User must have an email address';
  }

  var apiKey = Telescope.settings.get('mailChimpAPIKey');
  var listId = Telescope.settings.get('mailChimpListId');

  // add a user to a MailChimp list.
  // called when a new user is created, or when an existing user fills in their email
  if(!!apiKey && !!listId){

    try {

      console.log('// Adding "'+email+'" to MailChimp list…');

      var api = new MailChimp(apiKey);
      var subscribeOptions = {
        id: listId,
        email: {"email": email},
        double_optin: confirm
      };

      // subscribe user
      var subscribe = api.call('lists', 'subscribe', subscribeOptions);

      // mark user as subscribed
      if (!!user) {
        Users.setSetting(user, 'newsletter.subscribeToNewsletter', true);
      }

      console.log("// User subscribed");

      return subscribe;

    } catch (error) {
      throw new Meteor.Error("subscription-failed", error.message);
    }
  }
};

Meteor.methods({
  sendCampaign: function () {
    if(Users.is.adminById(this.userId))
      return Campaign.scheduleNextWithMailChimp(false);
  },
  testCampaign: function () {
    if(Users.is.adminById(this.userId))
      return Campaign.scheduleNextWithMailChimp(true);
  },
  addCurrentUserToMailChimpList: function(){
    var currentUser = Meteor.users.findOne(this.userId);
    try {
      return addToMailChimpList(currentUser, false);
    } catch (error) {
      throw new Meteor.Error(500, error.message);
    }
  },
  addEmailToMailChimpList: function (email) {
    try {
      return addToMailChimpList(email, true);
    } catch (error) {
      throw new Meteor.Error(500, error.message);
    }
  }
});