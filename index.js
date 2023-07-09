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
        if(Date.now() / 1000 - 3600 > docData.weatherInfo.current.dt){
            try {
                logger.info("get fresh data from weather api", {structuredData: true});
                const resFetch = await fetch(WEATHER_API_URL+docData.appid);
                weatherData = await resFetch.json();
            } catch (err) {
                return {err:"error fetching data from weather api"}
            }
        }else{
            logger.info("skipping weather api we already have data from the last 60 min", {structuredData: true});
        }
        const isNight = isSunset(weatherData.current.dt,weatherData.current.sunset )
        const currentDate = Date.now()
        const currentWindSpeed = getKnotes(weatherData.current.wind_speed)
        const goodHours = weatherData.hourly.filter(d=>{
            const isGoodWindSpeed = (d.wind_speed*1.94)>11?true:false
            const isDayTime = isSunset(d.dt, weatherData.current.sunset)
            if(isGoodWindSpeed && isDayTime){
                return true
            }else{
                return false
            }
        })
        const updatedObj = {dataObj:{"isSunset":isNight, "owners":"Team Lachmish", currentWind:currentWindSpeed + ' knots!', goodHours:goodHours},...docData,weatherInfo:{date:currentDate,...weatherData}}
        await firestore.collection(COLLECTION_NAME).doc("current").update(updatedObj)
      return res.status(200).send(updatedObj)
    }
    return getCurrentWindSpeed()
    
});
