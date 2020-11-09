const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name == "fastingNotification") {
        chrome.storage.local.get(['calendar'], function (result) {
            if (result.hasOwnProperty('calendar') && result.calendar) {
                const calendarDate = new Date(result.calendar.date);
                if (calendarDate.getMonth() !== (new Date()).getMonth()) {
                  //get calendar for new month
                  getNewCalendar();
                } else {
                  //print old calendar
                 checkNotification(result.calendar.data);
               }
              } else {
                //get new calendar
                getNewCalendar();
              }
        });
    }
});

function getNewCalendar () {
    const currentDate = new Date();
    $.get('http://api.aladhan.com/v1/gToHCalendar/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear(), function (data) {
      chrome.storage.local.set({calendar: {date: currentDate.toString(), data: data.data}});
      checkNotification(data.data);
    });
}

function checkNotification (data) {
    const currentDay = (new Date()).getDate() - 1;
    for (let i = 0; i < data.length; i++) {
        if (data[i].gregorian.day == currentDay) {
            if (isFastingDay(parseInt(data[i].hijri.day), weekdays.indexOf(data[i].gregorian.weekday.en), data[i].hijri.holidays, 
                i > 0 ? data[i - 1].hijri.holidays : [], i < data.length + 1 ? data[i + 1].hijri.holidays : [])) {
                    //send notification
                    chrome.notifications.create('fastingReminder', {
                        type: 'basic',
                        iconUrl: 'assets/icon-128.png',
                        title: 'Fasting Reminder',
                        message: 'Tomorrow is a Sunah Fasting Day'
                    });
                }

                break;
        }
    }
}

function isFastingDay (day, dayOfWeek, holidays, dayBeforeHolidays, dayAfterHolidays) {
    return day == 13 || day == 14 || day == 15 || dayOfWeek == "Monday" || dayOfWeek == "Thursday" || 
      holidays.includes("Ashura") || holidays.includes("Arafa") || dayBeforeHolidays.includes("Ashura") || 
      dayAfterHolidays.includes("Ashura");
  }