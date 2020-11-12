//
// Copyright (c) 2020 by Shahed Nasser. All Rights Reserved.
//

$(document).ready(function(){
  let audio,
      athkar = [],
      originalWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  })
  localizeHtmlPage();
  load(false, true);
  chrome.storage.sync.get(["show_date", "date", "showed_survey_popup", 
    "showed_new_feature_report", "showed_new_feature_calendar"], function(result){
    if(!result.hasOwnProperty("show_date") || result.show_date){
      const date = new Date();
      let currentDate = date.toLocaleDateString();
      if(!result.hasOwnProperty("date") || result.date.gregorianDate !== currentDate){
        $.get('http://api.aladhan.com/v1/gToH', function(data){
          let hijriData = data.data.hijri;
          chrome.storage.sync.set({date: {gregorianDate: currentDate, hijriData: hijriData}});
          setDates(date, currentDate, hijriData);
        });
      } else {
        setDates(date, currentDate, result.date.hijriData);
      }
    }
    if (!result.hasOwnProperty("showed_survey_popup") || !result.showed_survey_popup) {
      Swal.fire({
        title: chrome.i18n.getMessage('feedback_window_title'),
        html: chrome.i18n.getMessage('feedback_window_content'),
        showConfirmButton: false,
        showCloseButton: true,
        onClose: function () {
          chrome.storage.sync.set({showed_survey_popup: true});
        }
      })
    }

    if (!result.hasOwnProperty("showed_new_feature_report") || !result.showed_new_feature_report) {
      Swal.fire({
        icon: 'info',
        title: chrome.i18n.getMessage('reporting_window_message'),
        html: chrome.i18n.getMessage('reporting_window_content'),
        showConfirmButton: false,
        showCloseButton: true,
        onClose: function () {
          chrome.storage.sync.set({showed_new_feature_report: true});
        }
      })
    }

    if (!result.hasOwnProperty("showed_new_feature_calendar") || !result.showed_new_feature_report) {
      Swal.fire({
        icon: 'info',
        title: chrome.i18n.getMessage('new_features_title'),
        html: chrome.i18n.getMessage('new_features_calendar_content'),
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          content: 'new-features-list'
        },
        onClose: function () {
          chrome.storage.sync.set({showed_new_feature_calendar: true});
        }
      })
    }
  });

  $(".reload").click(function(){
    load(true, false);
  });

  $(".audio-player").click(function(){
    $(".audio-player .error").hide();
    if(!audio){
      chrome.storage.local.get(["verse"], function(result){
        if(result.hasOwnProperty("verse") && result.verse.hasOwnProperty("audio")){
          audio = new Audio(result.verse.audio);
          $(audio).on('loadstart', function(){
            $(".audio-player .error").hide();
            $(".audio-player img").hide();
            $(".audio-player .loader").show();
          });
          $(audio).on('ended', function(){
            $(".audio-player img").attr('src', 'assets/play.svg');
          })
          audio.play().then(function(){
            $(".audio-player .error").hide();
            $(".audio-player img").attr('src', 'assets/pause.svg');
            $(".audio-player img").show();
            $(".audio-player .loader").hide();
          }).catch(function(){
            $(".audio-player img").attr('src', 'assets/alert-triangle.svg');
            $(".audio-player .error").text("Can't connect.");
            $(".audio-player .error").show();
            $(".audio-player img").show();
            $(".audio-player .loader").hide();
          });
        }
      });
    } else {
      if(audio.paused){
        audio.play().then(function(){
          $(".audio-player img").attr('src', 'assets/pause.svg');
        }).catch(function(){
          $(".audio-player img").attr('src', 'assets/alert-triangle.svg');
          $(".audio-player .error").text("Can't connect.");
          $(".audio-player .error").show();
          $(".audio-player img").show();
          $(".audio-player .loader").hide();
        });
      } else {
        audio.pause();
        $(".audio-player img").attr('src', 'assets/play.svg');
      }
    }
  });

  $("body").on('click', '.settings-link, .notifications-reminder', function(){
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  $(".report").click(function() {
    Swal.fire({
      title: chrome.i18n.getMessage('report_image_window_title'),
      html: chrome.i18n.getMessage('report_image_window_content'),
      showConfirmButton: true,
      showCloseButton: true,
      confirmButtonText: chrome.i18n.getMessage('report_image_window_title'),
      showCancelButton: true,
      showLoaderOnConfirm: true,
      preConfirm: function () {
        const imageElm = $(".background-image");
        if (imageElm.length) {
          return $.ajax({
            url: 'http://quran-extension-api.alwaysdata.net/blacklistImage',
            type: 'PUT',
            data: {image: imageElm.attr('src')},
            success: function (result) {
              return result;
            }
          });
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then (function () {
      load(true, false);
    })
  });

  $(".translation-container").hover(function () {
    $(this).children(".body").show('fast');
  }, function () {
    $(this).children(".body").hide('fast');
  });

  $(".calendar-btn").click(function () {
    $(".calendar-container").addClass("show");
  });

  $(".close-calendar").click(function () {
    $(".calendar-container").removeClass("show");
  });

  function load(reload, withTopSites){
    audio = null;
    $(".reload img").hide();
    $(".reload .loader").show();
    $(".calendar-inner-container").hide();
    $(".calendar-table .loader").show();
    chrome.storage.local.get(['image', 'verse', 'calendar'], function(result){
      chrome.storage.sync.get(['show_translation', 'translation_language', 'recitation',
                                  'translation_identifier', 'show_top_sites', 'show_athkar', 
                                  'calendar_start_day'], function(syncResult){
        if(navigator.onLine){
          if(!syncResult.hasOwnProperty('show_translation') || !syncResult.hasOwnProperty('translation_language') ||
              !syncResult.show_translation || !syncResult.translation_language || !syncResult.translation_identifier){
                $(".translation-container").remove();
              }
          let now = (new Date()).getTime();
          if(result.hasOwnProperty('image') && result.image && now <= result.image.timeout && !reload){
            setBackgroundImage(result.image.src);
          }
          else {
            setNewImage(reload);
          }

          if(result.hasOwnProperty('verse') && result.verse && now <= result.verse.timeout && !reload){
            setVerse(result.verse.data);
            if(syncResult.hasOwnProperty('show_translation') && syncResult.show_translation &&
              syncResult.hasOwnProperty('translation_identifier') && syncResult.translation_identifier &&
              syncResult.translation_identifier){
              setTranslation(result.verse.translation);
            }
          }
          else {
            let verseNumber = Math.floor(Math.random() * 6236) + 1;
            let url = 'http://api.alquran.cloud/v1/ayah/' + verseNumber + '/editions/quran-uthmani-min,';
            if(syncResult.hasOwnProperty('recitation')){
              url += syncResult.recitation;
            } else {
              url += 'ar.alafasy';
            }
            if(syncResult.hasOwnProperty('show_translation') && syncResult.show_translation &&
              syncResult.hasOwnProperty('translation_identifier') && syncResult.translation_identifier &&
              syncResult.translation_identifier){
              url += "," + syncResult.translation_identifier;
            }
            $.get(url, function(data){
              if(data.data){
                let verse = {};
                for(let i = 0; i < data.data.length; i++){
                  if(data.data[i].hasOwnProperty('audio')){
                    verse.audio = data.data[i].audio;
                  } else if(data.data[i].edition.language === "ar"){
                    setVerse(data.data[i]);
                    verse.data = data.data[i];
                  } else {
                    verse.translation = data.data[i];
                    setTranslation(data.data[i]);
                  }
                }
                let timeout = calculateTimeout();
                verse.timeout = timeout;
                chrome.storage.local.set({verse});
              }
            }).fail(function(){
              $(".translation-container").remove();
              setVerse(getDefaultVerse());
              $(".audio-player").remove();
            });
          }

          if (syncResult.hasOwnProperty('calendar_start_day')) {
            if (syncResult.calendar_start_day === "Sunday") {
              weekdays.unshift(...weekdays.splice(6));
            }
          }

          if (result.hasOwnProperty('calendar') && result.calendar) {
            const calendarDate = new Date(result.calendar.date);
            if (calendarDate.getMonth() !== (new Date()).getMonth()) {
              //get calendar for new month
              getNewCalendar();
            } else {
              //print old calendar
             setCalendar(result.calendar.data);
           }
          } else {
            //get new calendar
            getNewCalendar();
          }
        }
        else{
          $(".translation-container").remove();
          setBackgroundImage('assets/offline-image.jpg');
          setVerse(getDefaultVerse());
          $(".audio-player").remove();
        }
        if(withTopSites && (!syncResult.hasOwnProperty('show_top_sites') || syncResult.show_top_sites)){
          chrome.topSites.get(addTopSites);
        }
        if(!syncResult.hasOwnProperty('show_athkar') || syncResult.show_athkar){
          if(athkar.length == 0){
            $.getJSON('/js/json/athkar.json', function(json, textStatus) {
              athkar = json.athkar;
              showRandomThikr();
            });
          } else {
            showRandomThikr();
          }
        } else {
          $(".athkar-container").remove();
          showRandomThikr();
        }
      });
    });
    
    
  }

  function showRandomThikr(){
    let thikr = getRandomThikr();
    $(".athkar-container .thikr").text(thikr);
    $(".athkar-container").show();
  }

  function setBackgroundImage(url){
    $(".background-image").attr('src', url).on('load', function(){
      $(this).animate({opacity: 1}, 500);
      $(".reload img").show();
      $(".reload .loader").hide();
    }).on('error', function(){
      $(this).attr('src', 'assets/offline-image.jpg').animate({opacity: 1}, 500);
      $(".reload img").show();
      $(".reload .loader").hide();
    });
  }

  function setVerse(data){
        $(".verse").html('<div class="verse-text">' + data.text + '</div><div class="verse-details">' + data.surah.name +
                            " - " + data.numberInSurah + '</div>').animate({opacity: 1}, 500);
  }

  function calculateTimeout(){
    return timeout = (new Date()).getTime() + 3600000;
  }

  function getDefaultVerse(){
    return {
      edition: {
        englishName: "Simple",
        format: "text",
        identifier: "quran-simple",
        language: "ar",
        name: "Simple",
        type: "quran",
      },
      hizbQuarter: 201,
      juz: 26,
      manzil: 6,
      number: 4523,
      numberInSurah: 13,
      page: 503,
      ruku: 439,
      sajda: false,
      surah: {
        englishName: "Al-Ahqaf",
        englishNameTranslation: "The Dunes",
        name: "سورة الأحقاف",
        number: 46,
        numberOfAyahs: 35,
        revelationType: "Meccan",
      },
      text: "إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا فَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ"
    };
  }

  function setTranslation(translation){
    $(".translation-container .body").text(translation.text);
    $(".translation-container").show();
  }

  function addTopSites(topSites){
    if(topSites.length){
      let $container = $('<div class="content top-sites-container">');
      $container.appendTo('.content-container');
      for(let i = 0; i < topSites.length; i++){
        $container.append('<a href="' + topSites[i].url + '" class="shadow"><img src="https://plus.google.com/_/favicon?domain_url=' + topSites[i].url + '" />' +
                          topSites[i].title + '</a>')
      }
    }
  }

  function getRandomThikr(){
    return athkar[Math.floor(Math.random() * athkar.length)];
  }

  function setDates(dateObj, currentDate, hijriData){
    $(".gregorian-date").text(dateObj.getDate() + "/" + (dateObj.getMonth() + 1) + "/" + dateObj.getFullYear());
    $(".hijri-date").text(hijriData.day + " " + hijriData.month.ar + " " + hijriData.year)
    $(".hijri-date-en").text(hijriData.day + " " + chrome.i18n.getMessage(slugify(hijriData.month.en)) + " " + hijriData.year)
    if(hijriData.hasOwnProperty("holidays") && hijriData.holidays.length > 0){
      let text = "";
      for(let i = 0; i < hijriData.holidays.length; i++){
        if(i !== 0){
          text += "<br>"
        }
        text += hijriData.holidays[i];
      }
      $(".holidays").html(text);
    }
  }

  function setNewImage(reload) {
    let xhr = new XMLHttpRequest();
    $.ajax({
      method: 'GET',
      url: 'https://source.unsplash.com/1600x900/?nature,mountains,landscape,animal',
      headers: {
        'Access-Control-Expose-Headers': 'ETag'
      },
      xhr: function() {
       return xhr;
      },
      success: function(data){
        $.getJSON('http://quran-extension-api.alwaysdata.net/isImageBlacklisted?image=' + encodeURI(xhr.responseURL), 
        function(json, textStatus) {
          if (json.success) {
            if (json.blacklisted) {
              setNewImage(false);
            } else {
              setBackgroundImage(xhr.responseURL);
              let timeout = calculateTimeout();
              chrome.storage.local.set({image: {src: xhr.responseURL, timeout}});
            }
          }
        });
      },
      error: function(){
        setBackgroundImage('/assets/offline-image.jpg');
      },
      complete: function(){
        if(reload){
          $(".reload img").show();
          $(".reload .loader").hide();
        }
      }
    });
  }

  function getNewCalendar () {
    const currentDate = new Date();
    $.get('http://api.aladhan.com/v1/gToHCalendar/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear(), function (data) {
      setCalendar(data.data);
      chrome.storage.local.set({calendar: {date: currentDate.toString(), data: data.data}});
    })
  }

  function setCalendar (data) {
    $(".calendar__header").nextAll().remove();
    //set headings
    $(".calendar__header").children().each(function (index) {
      $(this).text(chrome.i18n.getMessage(weekdays[index]));
    });
    const nbDates = data.length;
    let startedDay = -1;
    let today = new Date();
    let todayDate = null;
    let i = 0;
    let nbWeeks = 0;
    let lastValue = 0;
    html = '';
    while (i < nbDates) {
      for (let z = 0; z < weekdays.length; z++) {
        if (data[i].gregorian.weekday.en != weekdays[z]) {
          continue;
        }
        if (startedDay == -1) {
          if (data[i].gregorian.weekday.en == weekdays[z]) {
            startedDay = i;
          }
        }
  
        if (i == nbDates - 1) {
          if (data[i].gregorian.weekday.en !== weekdays[6]) {
            endedWeekday = weekdays.indexOf(data[i].gregorian.weekday.en);
          }
        }
  
        if (todayDate == null && today.getDate() == data[i].gregorian.day) {
          todayDate = i + 1;
        }
        i++;
        if (i >= nbDates) {
          break;
        }
      }

      html += addWeek(i == nbDates ? i - (nbDates - lastValue - 1) : (nbWeeks > 4 && i > nbDates - 7 && i <= nbDates ? i : i - 6), nbDates, todayDate, data);
      nbWeeks++;
      lastValue = i;
    }

    $(".calendar__header").after(html);
    $("#gregorianMonth").text(chrome.i18n.getMessage(data[0].gregorian.month.en));
    $("#hijriMonth").text(chrome.i18n.getMessage(slugify(data[0].hijri.month.en)));
    $(".calendar-table .loader").hide();
    $(".calendar-inner-container").show();
  }

  function addWeek (fromDay, totalDays, todayDate, calendarData) {
    str = '<div class="calendar__week">';
    let i = fromDay;
    for (let j = 0; j < 7; j++) {

      let additionalClasses = '';
      if (i <= 0 || i > totalDays) {
        additionalClasses = 'not-month-day';
      } else if (todayDate !== null && todayDate == i) {
        additionalClasses = 'today';
      }
      let dayStr = '<div class="calendar__day day ' + additionalClasses + '">' + (i > totalDays || i <= 0 ? "" : i + '<small class="calendar-hijri-date">' + calendarData[i - 1].hijri.day + '</small>');
      if (i <= totalDays && i > 0) {
        if (calendarData[i- 1].hijri.holidays.length) {
          for (let j = 0; j < calendarData[i- 1].hijri.holidays.length; j++) {
            dayStr += '<span class="badge badge-success calendar-note">' + calendarData[i- 1].hijri.holidays[j] + '</span>';
            hasAshura = calendarData[i- 1].hijri.holidays[j] == "Ashura";
          }
        }

        if (isFastingDay(parseInt(calendarData[i- 1].hijri.day), originalWeekdays[j], calendarData[i- 1].hijri.holidays, 
              i > 1 ? calendarData[i - 2].hijri.holidays : [], i < totalDays ? calendarData[i].hijri.holidays : [])) {
          dayStr += '<span class="badge badge-danger calendar-note">' + chrome.i18n.getMessage('Fasting') + '</span>';
        }
      }

      
      str += dayStr + '</div>';
      i++;
    }
    str += '</div>';
    return str;
  }

  function isFastingDay (day, dayOfWeek, holidays, dayBeforeHolidays, dayAfterHolidays) {
    return day == 13 || day == 14 || day == 15 || dayOfWeek == "Monday" || dayOfWeek == "Thursday" || 
      holidays.includes("Ashura") || holidays.includes("Arafa") || dayBeforeHolidays.includes("Ashura") || 
      dayAfterHolidays.includes("Ashura");
  }

  function slugify (str) {
    var map = {
        '_' : ' |-|ʿ',
        'a' : 'á|à|ã|â|ā|À|Á|Ã|Â',
        'e' : 'é|è|ê|É|È|Ê',
        'i' : 'í|ì|î|ī|Í|Ì|Î',
        'o' : 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
        'u' : 'ú|ù|û|ü|ū|Ú|Ù|Û|Ü',
        'c' : 'ç|Ç',
        'n' : 'ñ|Ñ',
        'H' : 'Ḥ',
        'h' : 'ḥ',
        'S' : 'Ṣ'
    };
    
    for (var pattern in map) {
        str = str.replace(new RegExp(map[pattern], 'g'), pattern);
    };

    return str;
  }

  function localizeHtmlPage()
  {
      //Localize by replacing __MSG_***__ meta tags
      var objects = document.getElementsByTagName('html');
      for (var j = 0; j < objects.length; j++)
      {
          var obj = objects[j];

          var valStrH = obj.innerHTML.toString();
          var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
          {
              return v1 ? chrome.i18n.getMessage(v1) : "";
          });

          if(valNewH != valStrH)
          {
              obj.innerHTML = valNewH;
          }
      }
  }
});
