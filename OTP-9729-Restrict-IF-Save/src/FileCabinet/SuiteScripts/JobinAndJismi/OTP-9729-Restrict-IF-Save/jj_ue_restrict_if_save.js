/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/************************************************************************************************ 
 *  
 * OTP-9729 : Fulfillment Restriction Based on Deposit Validation
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Prevents fulfillment of Sales Orders unless total deposits meet or exceed the order total.
 *               Allows bypass during bulk fulfillment via User Event context.
 * 
 * REVISION HISTORY
 *
 * @version 1.0 
 * 
*************************************************************************************************/

define(['N/log', 'N/record', 'N/runtime', 'N/search'],
    /**
     * @param {log} log
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     */
    (log, record, runtime, search) => {

        /**
         * Retrieves the total amount of the Sales Order and the sum of related customer deposits.
         * @param {number|string} soId - Internal ID of the Sales Order
         * @returns {{soTotal: number, depositTotal: number}} Totals for validation
         */
        function getSalesOrderAndDepositTotals(soId) {
            try {
                const soRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: soId,
                    isDynamic: false
                });

                const soTotal = parseFloat(soRec.getValue('total')) || 0;
                let depositTotal = 0;

                const depositSearch = search.create({
                    type: 'customerdeposit',
                    filters: [['salesorder', 'anyof', soId]],
                    columns: ['total']
                });

                depositSearch.run().each(result => {
                    depositTotal += parseFloat(result.getValue('total')) || 0;
                    return true;
                });

                return { soTotal, depositTotal };
            } catch (error) {
                log.error({ title: 'getSalesOrderAndDepositTotals Error', details: error.message });
                throw error;
            }
        }

        /**
         * Applies restriction logic based on execution context and deposit sufficiency.
         * @param {string} execContext - Execution context (e.g., USEREVENT, SUITELET)
         * @param {number|string} soId - Sales Order ID
         * @param {number} soTotal - Sales Order total
         * @param {number} depositTotal - Total deposits applied
         */
        function applyRestrictionLogic(execContext, soId, soTotal, depositTotal) {
            try {
                if (execContext === runtime.ContextType.USEREVENT) {
                    if (depositTotal < soTotal) {
                        log.audit('Restriction Bypassed',
                            `Bulk fulfillment detected for Sales Order ${soId}. Deposit less than Sales Order total, but restriction bypassed.`);
                    } else {
                        log.audit('Bulk Fulfillment Allowed',
                            `Deposit sufficient for Sales Order ${soId}. Bulk fulfillment proceeding.`);
                    }
                } else {
                    if (depositTotal < soTotal) {
                        throw `Cannot fulfill this Sales Order (${soId}). Total deposit (${depositTotal}) is less than the order total (${soTotal}).`;
                    } else {
                        log.debug('Validation Passed',
                            `Deposit sufficient for Sales Order ${soId}. Single fulfillment allowed.`);
                    }
                }
            } catch (error) {
                log.error({ title: 'applyRestrictionLogic Error', details: error.message });
                throw error;
            }
        }

        /**
         * Handles and rethrows errors for centralized logging.
         * @param {Error|string} error - Error object or message
         */
        function handleError(error) {
            log.error({ title: 'Unhandled Error', details: error });
            throw error;
        }

        /**
         * Executes before a record is submitted. Validates deposit sufficiency for fulfillment.
         * @param {Object} scriptContext - User Event context
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.CREATE) {
                    log.debug('Exit', 'Not a Create operation.');
                    return;
                }

                const newRec = scriptContext.newRecord;
                const execContext = runtime.executionContext;
                const soId = newRec.getValue('createdfrom');

                if (!soId) {
                    log.debug('Skip', 'No Sales Order linked.');
                    return;
                }

                const { soTotal, depositTotal } = getSalesOrderAndDepositTotals(soId);

                log.debug({
                    title: 'Deposit Validation',
                    details: `Sales Order ID: ${soId} | Sales Order Total: ${soTotal} | Deposit Total: ${depositTotal}`
                });

                applyRestrictionLogic(execContext, soId, soTotal, depositTotal);

            } catch (error) {
                handleError(error);
            }
        };

        return { beforeSubmit };
    });
