import pharmacyDbModel from "../Models/pharmacy.js"
import { Op } from 'sequelize';
import db from '../db/dbconnections.js'
import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const ACTIVATE_ON_PHARAMACY = "SELECT * FROM pharmacy WHERE is_active = 1 AND ACTIVATED_ON "
const PHARMACY_DATA_YEARLY = "SELECT MONTH(activated_on) AS month, COUNT(*) AS count " +
 " FROM pharmacy " +
 " WHERE is_active = true AND YEAR(activated_on) = :year "+
 " GROUP BY MONTH(activated_on);"
 
function convertToStartOfMonth(dateString) {
    // Parse the input date string
    const [monthName, year] = dateString.split(' ');
  
    // Create a Date object for the first day of the given month and year
    const date = new Date(`${monthName} 1, ${year}`);
  
    // Format the date to "YYYY-MM-DD"
    const yearFormatted = date.getFullYear();
    const monthFormatted = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
    const dayFormatted = '01'; // First day of the month
  
    const formattedDate = `${yearFormatted}-${monthFormatted}-${dayFormatted}`;
    return formattedDate;
  }

  function convertToEndOfMonth(dateString) {
    // Parse the input date string
    const [monthName, year] = dateString.split(' ');
  
    // Create a Date object for the first day of the next month
    const date = new Date(`${monthName} 1, ${year}`);
    const nextMonth = date.getMonth() + 1; // Move to the next month
  
    // Create a Date object for the first day of the next month
    const firstDayNextMonth = new Date(date.getFullYear(), nextMonth, 1);
  
    // Subtract one day to get the last day of the original month
    const lastDayOfMonth = new Date(firstDayNextMonth - 1);
  
    // Format the date to "YYYY-MM-DD"
    const yearFormatted = lastDayOfMonth.getFullYear();
    const monthFormatted = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
    const dayFormatted = String(lastDayOfMonth.getDate()).padStart(2, '0');
  
    const formattedDate = `${yearFormatted}-${monthFormatted}-${dayFormatted}`;
    return formattedDate;
  }


function generatePieChart(dataMonth, year, res) {
    const labels = [];
    const data = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
    dataMonth.forEach(row => {
      data.push({ name: monthNames[row.month - 1], y: row.count });
    });
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Chart</title>
        <script src="https://code.highcharts.com/highcharts.js"></script>
        <script src="https://code.highcharts.com/modules/exporting.js"></script>
      </head>
      <body>
        <div id="container" style="width:800px; height:600px;"></div>
        <script>
          document.addEventListener('DOMContentLoaded', function () {
            Highcharts.chart('container', {
              chart: {
                type: 'column'
              },
              title: {
                text: 'Pharmacies Activated in ${year}'
              },
              series: [{
                name: 'Activations',
                colorByPoint: true,
                data: ${JSON.stringify(data)}
              }]
            });
          });
        </script>
      </body>
    </html>
  `;
  let browser;
  (async () => {
    browser = await puppeteer.launch();
    const [page] = await browser.pages();
    await page.setContent(htmlContent);
    const chartElement = await page.$('#container');
    await chartElement.screenshot({ path: 'pharmacies_pie_chart.png' });
    const chartBuffer = await chartElement.screenshot();
    res.setHeader('Content-Type', 'image/png');
    res.send(chartBuffer);

  })()
    .catch(err => console.error(err))
    .finally(() => browser?.close());
  console.log('Pie chart saved as pharmacies_pie_chart.png');

  
}

  function getFirstAndLastDayOfYear(year) {
    // Ensure the input is a valid year string
    if (!/^\d{4}$/.test(year)) {
      throw new Error('Invalid year format');
    }
  
    // First day of the year
    const firstDayOfYear = `${year}-01-01`;
  
    // Last day of the year
    const lastDayOfYear = `${year}-12-31`;
  
    return { firstDayOfYear, lastDayOfYear };
  }

export const getAllPharmacy = (req, res) => {
    return pharmacyDbModel.findAll({})
        .then((pharmacy) => {
            if (!pharmacy) {
                res.status(404).send();
            } else {
                res.send(pharmacy);
            }
        })
        .catch((err) => {
            res.status(500).send(err);
        });
}

export const getAllPharmacyYearlyData = (req, res) => {
    const {year} = req.body;
    let queryReplacement = {
        year
    }
    return db.query(PHARMACY_DATA_YEARLY, {
        type: db.QueryTypes.SELECT,
        replacements: queryReplacement
    }).then((data)=> {
        let chart = generatePieChart(data, year, res)
        console.log(chart)
        // res.send(data)
    })
}
export const getAllPharmacySelectData = (req, res) => {
    const {query} = req.body;
    return db.query(query, {
        type: db.QueryTypes.SELECT,
    }).then((data)=> {
        console.log(data)
        res.send(data)
    })
}

export const getAllPharmacyApproved = (req, res) => {
    const { date, month, year, startDate, endDate, range } = req.body;
    try {
         if(range == "onDay" || range == "after" || range == "before" || range == "between") {
           if(range != "between" ) {
            if(!date && !month && !year) {
                res.status(400).send({ message: "date or month or year is required"});
            }
           }
           else {
               if(!startDate || !endDate) {
                 res.status(400).send({ message: "startDate and endDate is required"});
               }
            }
         } else {
            res.status(400).send({ message: "Range is required"});
         }
        
        let query = ACTIVATE_ON_PHARAMACY
        let queryReplacement;
        if (range == "after") {
            if (date) {
                queryReplacement = {
                    date
                }
                query += "> :date"
            } else if (month) {
                queryReplacement = {
                    endDate: convertToEndOfMonth(month)
                   }
                   query += "> :endDate"
            } else {
                const {lastDayOfYear} = getFirstAndLastDayOfYear(year);
                queryReplacement = {
                endDate: lastDayOfYear
               }
               query += "> :endDate"
            }
        } else if (range == "before") {
            if (date) {
                queryReplacement = {
                    date
                }
                query += "< :date"
            } else if (month) {
                queryReplacement = {
                    startDate: convertToStartOfMonth(month),
                }
                query += "< :startDate "
            } else {
                const { firstDayOfYear } = getFirstAndLastDayOfYear(year);
                queryReplacement = {
                startDate: firstDayOfYear,
               }
               query += "< :startDate "
            }
        } else if (range == "onDay") {
            
            if (date) {
                queryReplacement = {
                    date
                }
                query += "= :date"
            } else if(month) {
                queryReplacement = {
                startDate: convertToStartOfMonth(month),
                endDate: convertToEndOfMonth(month)
               }
               query += "BETWEEN :startDate AND :endDate"
            } else {
                const { firstDayOfYear, lastDayOfYear } = getFirstAndLastDayOfYear(year);
                queryReplacement = {
                startDate: firstDayOfYear,
                endDate: lastDayOfYear
               }
               query += "BETWEEN :startDate AND :endDate"
            }
            
        } else {
            queryReplacement = {
                startDate,
                endDate
            }
               query += "BETWEEN :startDate AND :endDate"
        }
        return db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: queryReplacement
        }).then((data)=> {
            res.send(data)
        })

    }
    catch (error) {
        res.status(400).send({ message: error});
    }

}



