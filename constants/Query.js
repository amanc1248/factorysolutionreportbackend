const generateReportQuery = (startDate, endDate, interval, systemId, userId) => {
    // Ensure dates are properly formatted for SQL
    return `
DECLARE @startDate DATETIME = '${startDate}';
DECLARE @endDate DATETIME = '${endDate}';
DECLARE @interval INT = ${parseInt(interval, 10)};
DECLARE @systemId VARCHAR(50) = '${systemId}';
DECLARE @userId VARCHAR(50) = '${userId}';

;WITH IntervalData AS (
    SELECT 
        DateAndTime,
        FT,
        TOTALIZER,
        PT,
        P_RunDay,
        P_RunHr,
        P_RunMn,
        userId,
        systemId,
        DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateAndTime) / @interval) * @interval, @startDate) AS IntervalStart,
        ROW_NUMBER() OVER (
            PARTITION BY DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateAndTime) / @interval) * @interval, @startDate)
            ORDER BY DateAndTime
        ) AS RowNum
    FROM TestFSN.dbo.maindata
    WHERE DateAndTime >= @startDate AND DateAndTime <= @endDate
    AND systemId = @systemId
    AND userId = @userId
)
SELECT
    DateAndTime,
    FT,
    TOTALIZER,
    PT,
    P_RunDay,
    P_RunHr,
    P_RunMn,
    userId,
    userId,
    systemId,
    IntervalStart
FROM IntervalData
WHERE RowNum = 1
ORDER BY DateAndTime;
   `;
};






// const generateReportQuery = (startDate, endDate, interval, systemId, userId) => {
//     return `
// DECLARE @startDate DATETIME = '${startDate}';
// DECLARE @endDate DATETIME = '${endDate}';
// DECLARE @interval INT = ${parseInt(interval, 10)};
// DECLARE @systemId VARCHAR(50) = '${systemId}';
// DECLARE @userId VARCHAR(50) = '${userId}';

// ;WITH IntervalData AS (
//     SELECT 
//         DateAndTime,
//         Flow,
//         FT_Tot,
//         Pressure,
//         userId,
//         systemId,
//         DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateAndTime) / @interval) * @interval, @startDate) AS IntervalStart,
//         ROW_NUMBER() OVER (
//             PARTITION BY DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateAndTime) / @interval) * @interval, @startDate)
//             ORDER BY DateAndTime
//         ) AS RowNum
//     FROM TestFSN.dbo.maindata
//     WHERE DateAndTime >= @startDate AND DateAndTime <= @endDate
//     AND systemId = @systemId
//     AND userId = @userId
// )
// SELECT
//     DateAndTime,
//     Flow,
//     FT_Tot,
//     Pressure,
//     userId,
//     systemId,
//     IntervalStart
// FROM IntervalData
// WHERE RowNum = 1
// ORDER BY DateAndTime;
//    `;
// };
module.exports = {
    generateReportQuery,
};
