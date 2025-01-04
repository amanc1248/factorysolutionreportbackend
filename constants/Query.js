const generateReportQuery = (startDate, endDate, interval, systemId, userId, subSystemIds) => {
    const formattedSubSystemIds = subSystemIds.map(id => `'${id}'`).join(', ');

    return `
DECLARE @startDate DATETIME = '${startDate}';
DECLARE @endDate DATETIME = '${endDate}';
DECLARE @interval INT = ${parseInt(interval, 10)};
DECLARE @systemId VARCHAR(50) = '${systemId}';
DECLARE @userId VARCHAR(50) = '${userId}';

;WITH IntervalData AS (
    SELECT 
        DateTime,
        FT,
        TOTALIZER,
        PT,
        LT,
        P_RunDay,
        P_RunHr,
        P_RunMn,
        userId,
        systemId,
        subSystemId,
        DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateTime) / @interval) * @interval, @startDate) AS IntervalStart,
        ROW_NUMBER() OVER (
            PARTITION BY 
                DATEADD(MINUTE, (DATEDIFF(MINUTE, @startDate, DateTime) / @interval) * @interval, @startDate),
                subSystemId
            ORDER BY DateTime
        ) AS RowNum
    FROM DHADHIKOTEMAINDB.dbo.MainTable
    WHERE DateTime >= @startDate 
      AND DateTime < DATEADD(MINUTE, 1, @endDate) -- Adjusted to include the final minute
      AND systemId = @systemId
      AND userId = @userId
      AND subSystemId IN (${formattedSubSystemIds})
)
SELECT
    DateTime,
    FT,
    TOTALIZER,
    PT,
    LT,
    P_RunDay,
    P_RunHr,
    P_RunMn,
    userId,
    systemId,
    subSystemId,
    IntervalStart
FROM IntervalData AS ID
WHERE ID.RowNum = 1
ORDER BY ID.DateTime;
   `;
};

module.exports = {
    generateReportQuery,
};