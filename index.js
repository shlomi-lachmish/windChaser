/**
 * Import function triggers from their respective submodules:
*
* const {onCall} = require("firebase-functions/v2/https");
* const {onDocumentWritten} = require("firebase-functions/v2/firestore");
*
* See a full list of supported triggers at https://firebase.google.com/docs/functions
*/

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require('node-fetch');
const {Firestore} = require('@google-cloud/firestore');

const PROJECTID = 'windchaser-d1c0d';
const COLLECTION_NAME = 'windChaser';
const WEATHER_API_URL = "https://api.openweathermap.org/data/3.0/onecall?lat=32.27&lon=34.83&appid="

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true
});


exports.windTrends = onRequest((req, res) => {
    logger.info("Hello logs!", {structuredData: true});
    const isSunset = (dt,sunset)=>((dt>sunset)?true:false)
    const getKnotes = (speed)=>(speed*1.94)
    const getCurrentWindSpeed = async() => {
        let docData ={ firestore:"before db read"}
        try {
            const docObj = await firestore.collection(COLLECTION_NAME).doc("current").get()
            docData = await docObj.data()
        } catch (err) {
            return {err:"error fetching data from firestore"}
        }
        let weatherData = {...docData.weatherInfo,date: Date.now()}
        if(Date.now() / 1000 - 1790 > docData.weatherInfo.current.dt){
            try {
                logger.info("get fresh data from weather api", {structuredData: true});
                const resFetch = await fetch(WEATHER_API_URL+docData.appid);
                weatherData = await resFetch.json();
            } catch (err) {
                return {err:"error fetching data from weather api"}
            }
        }else{
            logger.info("skipping weather api we already have data from the last 30 min", {structuredData: true});
        }
        const isNight = isSunset(weatherData.current.dt,weatherData.current.sunset )
        const currentDate = Date.now()
        const currentWindSpeed = getKnotes(weatherData.current.wind_speed)
        const goodHours = weatherData.hourly.filter(d=>{
            const isGoodWindSpeed = (d.wind_speed*1.94)>11?true:false
            const isNidghtTime = isSunset(d.dt, weatherData.current.sunset)
            if(isGoodWindSpeed && !isNidghtTime){
                return true
            }else{
                return false
            }
        })
        let goodHoursMap
        await Promise.all(
            goodHoursMap = goodHours.map(h=>{
                const returnObj = {}
                returnObj.dateText = new Date(h.dt * 1000)
                returnObj.wind_speed =  (Math.round(h.wind_speed*1.94 * 10) / 10).toFixed(1)
                returnObj.wind_gust =(Math.round(h.wind_gust*1.94 * 10) / 10).toFixed(1)
                returnObj.wind_deg = h.wind_deg
                return returnObj
            })
        )
        const goodDays = weatherData.daily.filter(d=>{
            const isGoodWindSpeed = (d.wind_speed*1.94)>11?true:false
            const isNidghtTime = isSunset(d.dt, weatherData.current.sunset)
            if(isGoodWindSpeed && !isNidghtTime){
                return true
            }else{
                return false
            }
        })
        let goodDaysMap
        await Promise.all(
            goodDaysMap = goodDays.map(h=>{
                const returnObj = {}
                returnObj.dateText = new Date(h.dt * 1000)
                returnObj.wind_speed =  (Math.round(h.wind_speed*1.94 * 10) / 10).toFixed(1)
                returnObj.wind_gust =(Math.round(h.wind_gust*1.94 * 10) / 10).toFixed(1)
                returnObj.wind_deg = h.wind_deg
                return returnObj
            })
        )
        logger.info("just before update the db", {structuredData: true});
        // logger.info(goodHoursMap, {structuredData: true});
        const windText = "a northerly wind is 0°, an easterly wind is 90°, a southerly wind is 180°, and a westerly wind is 270°"
        const updatedObj = {...docData,weatherInfo:{date:currentDate,...weatherData},dataObj:{"wind_deg_text":windText, isSunset:isNight, "owners":"Team Lachmish", currentWind:currentWindSpeed + ' knots!', goodHours:goodHoursMap, goodDays:goodDaysMap}}
        await firestore.collection(COLLECTION_NAME).doc("current").update(updatedObj)
        return res.status(200).send(updatedObj)
    }
    return getCurrentWindSpeed()
    
});
