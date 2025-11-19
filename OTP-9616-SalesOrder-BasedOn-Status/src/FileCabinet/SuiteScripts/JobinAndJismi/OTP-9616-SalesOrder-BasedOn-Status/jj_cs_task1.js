/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

/*************************************************************************************
 * Project Name : OTP-9616-SalesOrder Based On Status
 *
 * Author: Suryanath G
 * Date Created : 06-November-2025
 *
 * Description : Client script to trigger Suitelet reload based on filter field changes for displaying Sales Orders by status.
 *
 * REVISION HISTORY
 * @version 1.1 : Initial build
 *************************************************************************************/

define(['N/url', 'N/currentRecord'],
  /**
   * @param {url} url - NetSuite URL module
   * @param {currentRecord} currentRecord - NetSuite Current Record module
   */
  (url, currentRecord) => {

    const scriptId = 'customscript_jj_sl_so_basedonstatus';
    const deploymentId = 'customdeploy_jj_sl_so_basedonstatus';

    /**
     * Triggered when a field fieldValue changes on the form.
     * If the changed field is one of the filter fields, reloads the Suitelet with updated parameters.
     *
     * @param {Object} context - Field change context
     * @param {string} context.fieldId - ID of the field that was changed
     */
    const fieldChanged = (context) => {
      const record = currentRecord.get();

      /** @type {Object.<string, string>} */
      const fieldMap = {
        custpage_jj_status_filter: 'custpage_jj_status_filter',
        custpage_jj_customer_filter: 'custpage_jj_customer_filter',
        custpage_jj_subsidiary_filter: 'custpage_jj_subsidiary_filter',
        custpage_jj_department_filter: 'custpage_jj_department_filter'
      };

      if (Object.keys(fieldMap).includes(context.fieldId)) {
        const params = {};

        Object.keys(fieldMap).forEach(fieldId => {
          const fieldValue = record.getValue({ fieldId });
          if (fieldValue) {
            params[fieldMap[fieldId]] = fieldValue;
          }
        });

        const resolvedUrl = url.resolveScript({
          scriptId: scriptId,
          deploymentId: deploymentId,
          params: params
        });

        window.location.href = resolvedUrl;
      }
    };

    return { fieldChanged };
  });
