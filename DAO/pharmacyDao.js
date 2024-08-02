import pharmacyDbModel from "../Models/pharmacy.js"
import db from '../db/dbconnections.js'
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import puppeteer from "puppeteer";
import path from "path";
import {  join } from 'path';
import axios from 'axios';
import { promises as fsPromises } from 'fs';
import { log } from "console";

const ACTIVATE_ON_PHARAMACY = "SELECT * FROM pharmacy WHERE is_active = 1 AND ACTIVATED_ON "
const PHARMACY_DATA_YEARLY = "SELECT MONTH(activated_on) AS month, COUNT(*) AS count " +
    " FROM pharmacy " +
    " WHERE is_active = true AND YEAR(activated_on) = :year " +
    " GROUP BY MONTH(activated_on) " +
    " ORDER BY month ASC ;"
const ACTIVATED_DATE_BY_ID = "SELECT ACTIVATED_ON FROM pharmacy WHERE ID = :id"

const __filename = fileURLToPath(import.meta.url);
const publicDir = join('public');


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
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function generatePieChart (dataMonth, year, res, req, chartTitle, xAxisTitle, yAsxixTitle, xAxixCol, yAxixCol, chartType, category, categoryValue, legends) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    
    const data = [];
    var backgroundColors = []
    var borderColors = []
    if (xAxixCol && chartType == "Bar Chart") {
        if(typeof dataMonth[0][xAxixCol] == "number") {
            dataMonth.forEach(row => {
                labels.push(monthNames[row[`${xAxixCol}`] - 1]);
                data.push(row[`${yAxixCol}`]);
            });
        } else {
            res.status(400).send({error: "y_axix_column should be a number"})
        }
        
    } else if (category && chartType == "Pie Chart") {
        dataMonth.forEach(row => {
            if (category == "Month") {
                labels.push(monthNames[row[`${category}`] - 1]);
            } else {
                labels.push(row[`${category}`]);
            }
            if (typeof row[`${categoryValue}`] == "number") {
                data.push(row[`${categoryValue}`]);
            } else {
                res.status(400).send({error: "categoryValue should be a number"})

            }
            
        });
        backgroundColors = dataMonth.map(() => getRandomColor());
        borderColors = backgroundColors.map(color => color.replace('0.2', '1'));
    } else {
        dataMonth.forEach(row => {
            labels.push(monthNames[row.month - 1]);
            data.push(row.count);
        });
    }
    const step = Math.ceil((Math.max(...data) - Math.min(...data)) * 0.2);
    const maxData = Math.max(...data);
    const max = (maxData + step) + (step - (maxData + step) % step) % step;
    console.log(data, labels)
    var chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: chartTitle ? chartTitle : `Pharmacies Activated in ${year}`,
                    data: data,
                    backgroundColor:'#004AAD',
                    barPercentage: 0.6,
                },
            ],

        },
        options: {
            layout: { padding: { bottom: 6, top: 25, left: 8, right: 20 } },
            // title: {
            //     display: chartTitle ?true:false,
            //     text: chartTitle ? chartTitle :'',
            //     fontColor: '#666',
            //     fontStyle: 'bold',
            //     fontSize:'14',
            //     fontFamily: 'canva sans - regular',
            //   },
            legend: {
                display: false,
            },
            plugins: {
                roundedBars: true ,
                datalabels: {
                    display: legends == "Yes",
                    anchor: 'end',
                    align: 'end',
                    color: '#0000FF',
                    fontFamily: 'canva sans - regular',
                    fontColor:'#0049AF',
                    fontSize:'10',
                    formatter: (value) => {
                        return value.y;
                    },
                    // font: {
                    //     weight: 'bold',
                    // }
                },
                background: {
                    color: '#ffffff' // Set the background color to white
                }
            },
            
            scales: {
                xAxes: [{
                  scaleLabel: {
                    display: xAxisTitle && xAxisTitle.toLowerCase() !== 'null',
                    labelString: xAxisTitle??'',
                    fontColor: '#8696A0',
                    fontStyle: 'light',
                    fontSize:'12',
                    fontFamily: 'canva sans - regular',
                    padding: 0
                  },
                  gridLines: {
                    display: false,
                },
                ticks:{
                    fontFamily: 'canva sans - regular',
                    fontColor:'#0049AF',
                    fontSize:'10',

                }
                }],
                yAxes: [{
                  scaleLabel: {
                    display: yAsxixTitle && yAsxixTitle.toLowerCase() !== 'null'? true: false,
                    labelString: yAsxixTitle??'',
                    fontColor: '#8696A0',
                    fontStyle: 'light',
                    fontSize:'12',
                    fontFamily: 'canva sans - regular',
                    padding:0
    
                  },
                  ticks: {
                    beginAtZero: true,
                    stepSize: step,
                    max:max,
                    padding: 8,
                    fontFamily: 'canva sans - regular',
                    fontSize:'10',
                    fontColor:'#0049AF'
                  },
                  gridLines:{
                    drawBorder:false,
                    color: '#d9d8d7',
                  }
               
                }],
              }

        }
    }
   
    if (chartType == "Pie Chart") {
        chartConfig = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Colors Pie Chart',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                layout:{
                    padding: {
                left: 50,
                right:50,
                top: 10,
                bottom: 20
            }
                },
                plugins: {
                    legend: {
                        display: true,
                    },
                    datalabels: {
                        display: legends == "Yes", // Hide data labels
                        color: 'white',
                        font: {
                            size: 14, // Set the font size for the data labels
                            weight: 'bold' // Set the font weight for the data labels
                        }
                    },
                },
                title: {
                    display: true,
                    text: chartTitle,
                    color: "black",
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend:{
                    position:'left'
                }
            }
        };
    }
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const response = await axios.get(chartUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const base64Image = buffer.toString('base64');
        
        const imgSrc = `data:image/png;base64,${base64Image}`;
        const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Buffer Image</title>
        <style>
            #imageContainer {
                background: white;
                width: 500px;
                height: auto;
                padding-left : -15px;
            }
            #titleContainer {
                width: 500px;
                padding: 15px;
                background: #F1F1F1
            }
            #text{
            	color:#737373;
                font-family: 'Roboto', sans-serif;;
                font-weight:600;
                font-size: 14px;
                margin-bottom:5px
                
            }
            img {
                width: 100%;
                height: auto;
            }
        </style>
    </head>
    <body>
        <div id ="titleContainer">
        <div id="text"> ${chartTitle ? chartTitle : "BarChart"}</div>
            <div id="imageContainer">
                <img src="${imgSrc}" alt="Buffer Image"/>
            </div>
        </div>
    </body>
    </html>
    `;
    await page.setContent(htmlContent);
    await page.setViewport({ width: 600,
        height: 800, // Adjust height as necessary
        deviceScaleFactor: 2});
    // Take a screenshot
    await page.waitForSelector('#titleContainer');

        // Select the element and take a screenshot of it
        const element = await page.$('#titleContainer');
        const screenshotBuffer = await element.screenshot({
            type: 'png',        // Save as JPEG
            // quality: 100,         // Set quality (0-100)
            omitBackground: true // Omit the background
        });

    await browser.close();
    //  Set the response headers to indicate an image
    //  res.setHeader('Content-Type', 'image/png');
    //  res.setHeader('Content-Disposition', 'inline; filename="output.png"');

    //  // Send the image buffer as the response
    //  res.send(screenshotBuffer);

        // Generate a file name with a timestamp

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snakeCaseText = chartTitle?.replace(/\s+/g, '_')?.toLowerCase();
        const fileName = chartTitle ? `barchart_${snakeCaseText}_${timestamp}.png` : `barchart_${year}_${timestamp}.png`;
        const filePath = join(publicDir, fileName);      
        console.log(buffer)
        // Write the image to file
        await fsPromises.writeFile(filePath, screenshotBuffer);
        console.log(`File created: ${filePath}`);

        // Send the link to download the file
        const fullUrl = `${req.protocol}://${req.get('host')}/public/${fileName}`;
        res.json({ link: fullUrl });
    })()
        .catch(err => res.status(404).send(err, "hiiii"))
        .finally(() => { });
    // Fetch the image from QuickChart and save it locally


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
    const { year } = req.body;
    let queryReplacement = {
        year
    }
    return db.query(PHARMACY_DATA_YEARLY, {
        type: db.QueryTypes.SELECT,
        replacements: queryReplacement
    }).then((data) => {
        if (data.length > 1) {
            generatePieChart(data, year, res, req, null, null, null, null, null, "Bar Chart", null, null, null)
        } else {
            res.send({ response: "Success", message: "no data found" })
        }
        // res.send(data)
    })
}
export const getAllPharmacySelectData = (req, res) => {
    const { query, chart } = req.body;
    try {
        return db.query(query, {
            type: db.QueryTypes.SELECT,
        }).then(async (data) => {
            if (data.length > 10) {

                const wb = xlsx.utils.book_new();
                const ws = xlsx.utils.json_to_sheet(data);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                // Append worksheet to workbook
                xlsx.utils.book_append_sheet(wb, ws, 'Activations');

                // Generate a file name

                const fileName = `activations${timestamp}.xlsx`;
                const filePath = path.join('public', fileName);

                // Write workbook to file
                xlsx.writeFile(wb, filePath);

                // Send the link to download the file
                const fullUrl = `${req.protocol}://${req.get('host')}/public/${fileName}`;
                if (chart) {
                    const columnNames = Object.keys(data[0])
                    res.json({ link: fullUrl, chart_data: columnNames });
                } else {
                    res.json({ link: fullUrl });

                }


            }
            else {
                if (data.length > 0) {
                    if (chart) {
                        const columnNames = Object.keys(data[0])
                        res.json({ data, chart_data: columnNames })
                    }
                    else {
                        res.json(data)

                    }
                } else {
                    res.status(400).send({ message: "No data found" })
                }

            }

        })
    }
    catch (error) {
        res.status(400).send({ message: error });
    }
}

export const getChartDataByQuery = (req, res) => {
    const { query, chart_title, x_axis_col, y_axis_col, x_axis_label, y_axis_label, chart_type, category, categoryValue, legends } = req.body;
    try {
        if (!chart_type) {
            res.status(400).send({ message: "chart_type  is required" });
        }
        else if (chart_type == "Bar Chart" && !chart_title && !x_axis_col && !y_axis_col && !x_axis_label && !y_axis_label && !legends) {
            res.status(400).send({ message: "chart_title, x_axis_col, y_axis_col, x_axis_label, legends and y_axis_label  is required" });
        }
        else if (chart_type == "Pie Chart" && !chart_title && !category && !categoryValue && !legends) {
            res.status(400).send({ message: "chart_title, category, categoryValue and legends  is required" });
        } else {
            return db.query(query, {
                type: db.QueryTypes.SELECT
            }).then((data) => {
                if (data.length > 1) {
                    generatePieChart(data, null, res, req, chart_title, x_axis_label, y_axis_label, x_axis_col, y_axis_col, chart_type, category, categoryValue, legends)
                } else {
                    res.send({ response: "Success", message: "no data found" })
                }
            })



        }
    }
    catch (error) {
        res.status(400).send({ message: error });
    }
}

export const getActivatedDateById = (req, res) => {
    const id = req.query.id;
    let queryReplacement = { id }
    return db.query(ACTIVATED_DATE_BY_ID, {
        type: db.QueryTypes.SELECT,
        replacements: queryReplacement
    }).then((data) => {
        res.send(data)
    })
}

export const getAllPharmacyApproved = (req, res) => {
    const { date, month, year, startDate, endDate, range } = req.body;
    try {
        if (range == "onDay" || range == "after" || range == "before" || range == "between") {
            if (range != "between") {
                if (!date && !month && !year) {
                    res.status(400).send({ message: "date or month or year is required" });
                }
            }
            else {
                if (!startDate || !endDate) {
                    res.status(400).send({ message: "startDate and endDate is required" });
                }
            }
        } else {
            res.status(400).send({ message: "Range is required" });
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
                const { lastDayOfYear } = getFirstAndLastDayOfYear(year);
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
            } else if (month) {
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
        }).then((data) => {
            res.send(data)
        })

    }
    catch (error) {
        res.status(400).send({ message: error });
    }

}



