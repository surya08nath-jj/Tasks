/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/************************************************************************************************ 
 *  
 * OTP-9656 : Blood Donor Search Interface
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Suitelet to search eligible blood donors based on blood group and donation date.
 * 
 * REVISION HISTORY
 *
 * @version 1.0 
 * 
*************************************************************************************************/ 

define(['N/ui/serverWidget', 'N/search', 'N/log'],
  /**
   * @param {serverWidget} serverWidget
   * @param {search} search
   * @param {log} log
   */
  function (serverWidget, search, log) {

    const CUSTOM_RECORD_TYPE = 'customrecord_jj_blood_donor_details';
    const CLIENT_SCRIPT_PATH = './jj_cs_donorsearch.js';

    /**
     * Entry point for Suitelet execution.
     * @param {Object} context - Suitelet context object
     */
    function onRequest(context) {
      try {
        log.debug('Suitelet Triggered', 'Request method: ' + context.request.method);
        displayForm(context);
      } catch (e) {
        log.error('Error in onRequest', e.message || e.toString());
      }
    }

    /**
     * Displays the donor search form and results based on submitted parameters.
     * @param {Object} context - Suitelet context object
     */
    function displayForm(context) {
      try {
        log.debug('Display Form', 'Initializing form');

        const form = serverWidget.createForm({ title: 'Blood Donor Search' });
        form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

        const bloodGroup = form.addField({
          id: 'custpage_blood_group',
          type: serverWidget.FieldType.SELECT,
          label: 'Blood Group'
        });
        bloodGroup.isMandatory = true;
        bloodGroup.name = 'custpage_blood_group';
        bloodGroup.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.NORMAL });
        bloodGroup.updateBreakType({ breakType: serverWidget.FieldBreakType.START });

        bloodGroup.addSelectOption({ value: '', text: '' });
        bloodGroup.addSelectOption({ value: '1', text: 'A+' });
        bloodGroup.addSelectOption({ value: '2', text: 'A-' });
        bloodGroup.addSelectOption({ value: '3', text: 'B+' });
        bloodGroup.addSelectOption({ value: '4', text: 'B-' });
        bloodGroup.addSelectOption({ value: '5', text: 'AB+' });
        bloodGroup.addSelectOption({ value: '6', text: 'AB-' });
        bloodGroup.addSelectOption({ value: '7', text: 'O+' });
        bloodGroup.addSelectOption({ value: '8', text: 'O-' });

        const params = context.request.parameters;
        const selectedBloodGroup = params.custpage_blood_group;

        log.debug('Received Parameters', `Blood Group: ${selectedBloodGroup}`);

        let donorFilters = [['custrecord_jj_last_donation_date', 'onorbefore', 'threemonthsagotodate']];
        if (selectedBloodGroup) {
          bloodGroup.defaultValue = selectedBloodGroup;
          donorFilters.push('AND');
          donorFilters.push(['custrecord_jj_blood_group', 'is', selectedBloodGroup]);
        }

        try {
          log.debug('Search Start', 'Creating donor search');

          const donorSearch = search.create({
            type: CUSTOM_RECORD_TYPE,
            filters: donorFilters,
            columns: [
              'custrecord_jj_first_name',
              'custrecord_jj_last_name',
              'custrecord_jj_phone_numbers',
              'custrecord_jj_gender',
              'custrecord_jj_last_donation_date',
              'custrecord_jj_blood_group'
            ]
          });

          const donors = [];
          donorSearch.run().each(result => {
            donors.push({
              name: result.getValue('custrecord_jj_first_name') + ' ' + result.getValue('custrecord_jj_last_name'),
              phone: result.getValue('custrecord_jj_phone_numbers'),
              bloodGroup: result.getText('custrecord_jj_blood_group'),
              lastDonation: result.getValue('custrecord_jj_last_donation_date')
            });
            return true;
          });

          log.audit('Search Results', `Found ${donors.length} donor(s)`);

          form.addField({
            id: 'custpage_result_msg',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
          }).defaultValue = `<b>Found ${donors.length} eligible donor(s)</b>`;

          if (donors.length > 0) {
            const sublist = form.addSublist({
              id: 'custpage_donors',
              type: serverWidget.SublistType.LIST,
              label: 'Eligible Donors'
            });

            sublist.addField({ id: 'custpage_name', type: serverWidget.FieldType.TEXT, label: 'Name' });
            sublist.addField({ id: 'custpage_phone', type: serverWidget.FieldType.PHONE, label: 'Phone Number' });
            sublist.addField({ id: 'custpage_bloodgroup', type: serverWidget.FieldType.TEXT, label: 'Blood Group' });
            sublist.addField({ id: 'custpage_lastdonation', type: serverWidget.FieldType.DATE, label: 'Last Donation Date' });

            donors.forEach((donor, i) => {
              sublist.setSublistValue({ id: 'custpage_name', line: i, value: donor.name });
              sublist.setSublistValue({ id: 'custpage_phone', line: i, value: donor.phone });
              sublist.setSublistValue({ id: 'custpage_bloodgroup', line: i, value: donor.bloodGroup });
              sublist.setSublistValue({ id: 'custpage_lastdonation', line: i, value: donor.lastDonation });
            });
          } else {
            form.addField({
              id: 'custpage_no_result',
              type: serverWidget.FieldType.INLINEHTML,
              label: ' '
            }).defaultValue = '<p>No eligible donors found.</p>';
          }

        } catch (searchError) {
          log.error('Search Error', searchError.message || searchError.toString());
        }

        form.addSubmitButton({ label: 'Search' });
        log.debug('Form Ready', 'Writing form to response');
        context.response.writePage(form);

      } catch (formError) {
        log.error('displayForm Error', formError.message || formError.toString());
      }
    }

    return {
      onRequest: onRequest
    };
  });
