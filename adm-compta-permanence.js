var Attendances = new Mongo.Collection("attendances")

moment.locale('fr')

if (Meteor.isClient) {

    // login options
    Accounts.ui.config({
       passwordSignupFields: 'USERNAME_ONLY'
    });

    Session.set("attendanceFilter", null);



    // tuesdays
    function getAllTuesdays() {

        var now =  moment(new Date()).locale('fr'); 

        var thisWeek = now.weeks(),
            remainingWeeks = now.isoWeeksInYear() - now.weeks(), // weeks until end of this year
            totalWeeks = remainingWeeks + moment().add(1, 'years').isoWeeksInYear(); // +1 year

        // store all tuesdays
        var tuesdays = [];

        // get closest Tuesday i.e. day 2 of the current week
        var tuesday = now.startOf('isoWeek').add(1, 'days');

        // add 7 days starting from tuesday
        for (var i = 0; i < totalWeeks; i++) {
            var nextTuesday = tuesday.add(1, 'weeks').format("YYYY MM DD");
            tuesdays.push(nextTuesday);
        };

        // console.log(tuesdays.length+ " tuesdays shown.");
        return tuesdays;
    }

    function getTuesday( week, year) { 
        return moment(new Date()).locale('fr').day("Tuesday").week(week).year(year).format("YYYY MM DD");
    }

    // 
    Template.tuesdays.helpers({

        tuesdays : function () {
            var rowSize = 4,
                tuesdays = [],
                dates = [];

            // basic filtering
            var filter = Session.get("attendanceFilter");
            if (filter == null) {
                tuesdays = getAllTuesdays();
            } else if (filter == "currentUser") {
                
                console.log(filter);
                tuesdays = Attendances.find({'owner' : Meteor.userId() }).fetch().map(function(d){
                    return getTuesday(d.weekNumber, d.year);
                })
            }

            // parse data or display
            for (var i = 0; i < tuesdays.length; i++) {

                var date = moment(new Date(tuesdays[i])).locale('fr'),
                    week = date.isoWeek(),
                    year = date.year(),
                    attending = false;

                var attendances = Attendances.find({'weekNumber' : week, 'year' : year }).fetch();

                var color  = "red"; // default is no present, set to red 
                if (attendances.length) color = (attendances.length >=  2) ? "green" : "orange"; 

                // check if logged in user has already submitted 
                if( Meteor.userId() ) {
                    attending = (attendances.map(function (d) { return d.owner }).indexOf(Meteor.userId()) != -1)? true : false;
                }

                // console.log(attendances);
                dates.push({
                    year : year,
                    date : date.format("dddd Do  MMMM"),
                    week : date.isoWeek(),
                    color : color,
                    attending : attending,
                    attendances : attendances
                });
            } 
            console.log(dates.length);

            var rowDates = [];
            for (var i = 0; i <dates.length; i+rowSize) {
                rowDates.push({ 'row' : dates.splice(i,i+rowSize) })
            }
            return rowDates
        },
        scheduled : function () {
            return Attendances.find({"owner" : Meteor.userId() }).count();
        }
    });

    Template.attend.events({
        "click [data-action='attendance/add']": function (e) {
            e.preventDefault()
            Meteor.call("addAttendance", this.week, this.year);
        },
        "click [data-action='attendance/delete']": function (e) {
            e.preventDefault()
            Meteor.call("removeAttendance", this.week, this.year);
        },
    });

    Template.tuesdays.events({
        "click [data-action='filter/currentUser']": function (e) {
            e.preventDefault()
            if(Meteor.user()) {
                console.log(Meteor.userId());
                Session.set('attendanceFilter', "currentUser");
            }
        },
        "click [data-action='filter/reset']": function (e) {
            e.preventDefault()
            Session.set('attendanceFilter', null);
        }
    });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    // Meteor.users.remove({});
    // Attendances.remove({});
  });

  Meteor.methods({
    addAttendance : function(weekNumber, year){
        console.log(weekNumber);

        // Make sure the user is logged in before inserting a task
        if (! Meteor.userId()) {
          throw new Meteor.Error("not-authorized");
        }
        // Make sure the user logged in is not already added
        else {
            var attendance = Attendances.findOne({"weekNumber" :weekNumber, "year" :year, owner : Meteor.userId() })
            console.log(attendance);
            if(attendance) throw new Meteor.Error("already-exists");
        }

        Attendances.insert({
            weekNumber : weekNumber,
            year : year,
            createdAt: new Date(),            // current time
            owner: Meteor.userId(),           // _id of logged in user
            username: Meteor.user().username,           // username of logged in user
        })
    },

    removeAttendance: function (week, year) {
        Attendances.remove({"weekNumber" :week, "year" :year, 'owner' : Meteor.userId() })
    }

  })
}
