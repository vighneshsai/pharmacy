import pharmacyDbModel from "../Models/pharmacy.js"
import { Op } from 'sequelize';
import db from '../db/dbconnections.js'
import puppeteer from 'puppeteer';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import ExcelJS from 'exceljs'

const ACTIVATE_ON_PHARAMACY = "SELECT * FROM pharmacy WHERE is_active = 1 AND ACTIVATED_ON "
const PHARMACY_DATA_YEARLY = "SELECT MONTH(activated_on) AS month, COUNT(*) AS count " +
 " FROM pharmacy " +
 " WHERE is_active = true AND YEAR(activated_on) = :year "+
 " GROUP BY MONTH(activated_on) " +
 " ORDER BY month ASC ;"
const ACTIVATED_DATE_BY_ID = "SELECT ACTIVATED_ON FROM pharmacy WHERE ID = :id"
 
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
      const countData = dataMonth.map((item)=>  item.count)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
   <head>
      <title>Highcharts Tutorial</title>
      <script src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js">
      </script>
      <script src = "https://code.highcharts.com/highcharts.js"></script>  
   </head>
   <body>
      <div id = "container" style = "width: 550px; height: 400px; margin: 0 auto"></div>
      <script language = "JavaScript">
         $(document).ready(function() {  
            var chart = {
               type: 'column'
            };
            var title = {
               text: 'Pharmacies Activated in ${year}'   
            };
          
            var xAxis = {
               categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul',
                  'Aug','Sep','Oct','Nov','Dec'],
               crosshair: true
            };
            var yAxis = {
               min: 0,
               title: {
                  text: 'Count'         
               },      
               
            };
             var series= [
               {
                  name: 'Month',
                  data: ${JSON.stringify(countData)}
               }, 
               
            ];  
            var tooltip = {
               headerFormat: '<span style = "font-size:10px">{point.key}</span><table>',
               pointFormat: '<tr><td style = "color:blue;padding:0"> </td>' +
                  '<td style = "padding:0"><b>{point.y:.1f} mm</b></td></tr>',
               footerFormat: '</table>',
               shared: true,
               useHTML: true
            };
            var plotOptions = {
               column: {
                  pointPadding: 0.2,
                  borderWidth: 0
               }
            };  
            var credits = {
               enabled: false
            };
              
         
            var json = {};   
            json.chart = chart; 
            json.title = title;   
            json.tooltip = tooltip;
            json.xAxis = xAxis;
            json.yAxis = yAxis;  
            json.series = series;
            json.plotOptions = plotOptions;  
            json.credits = credits;
            $('#container').highcharts(json);
  
         });
      </script>
   </body>
</html>
      `;
  let browser;
  (async () => {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const chartElement = await page.$('#container');
    await chartElement.screenshot({ path: 'pharmacies_pie_chart.png' });
    const chartBuffer = await chartElement.screenshot();
    res.setHeader('Content-Type', 'image/png');
    res.send(chartBuffer);

  })()
    .catch(err => res.status(404).send(err))
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
        if(data.length > 1) {
            generatePieChart(data, year, res)
        } else {
            res.send({response:"Success",message: "no data found"})
        }
        // res.send(data)
    })
}
export const getAllPharmacySelectData = (req, res) => {
    const {query} = req.body;
    try {
    return db.query(query, {
        type: db.QueryTypes.SELECT,
    }).then(async(data)=> {
        if (data.length > 10) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('My Data');
            const columns = Object.keys(data[0]).map((key) => ({
                header: key.charAt(0).toUpperCase() + key.slice(1),
                key: key,
                width: 20, // You can adjust the width as needed
              }));
            
              worksheet.columns = columns;
            
              // Add rows
              data.forEach((item) => {
                worksheet.addRow(item);
              });
            
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Content-Disposition', 'attachment; filename=mydata.xlsx');
            
              await workbook.xlsx.write(res);
              res.end();
        }
       else {
        res.JSON(data)
       }
       
    })
    }
    catch (error) {
        res.status(400).send({ message: error});
    }
}

export const getActivatedDateById = (req, res) => {
    const id = req.query.id;
    let queryReplacement = { id }
    return db.query(ACTIVATED_DATE_BY_ID, {
        type: db.QueryTypes.SELECT,
        replacements: queryReplacement
    }).then((data)=> {
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



