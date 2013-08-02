/**
 * Used by S3AddPersonWidget2 (modules/s3widgets.py)
 */

// Module pattern to hide internal vars
(function () {
    
    /**
     * Instantiate an AddPersonWidget
     * - in global scope as called from outside
     *
     * Parameters:
     * fieldname - {String} A unique fieldname for a person_id field
     */
    S3.addPersonWidget = function(fieldname) {
        // Function to be called by S3AddPersonWidget2

        var selector = '#' + fieldname;
        var real_input = $(selector);

        // Move the user-visible rows underneath the real (hidden) one
        var error_row = real_input.next('.error_wrapper');
        var title_row = $(selector + '_title__row');
        var name_row = $(selector + '_full_name__row');
        var date_of_birth_row = $(selector + '_date_of_birth__row');
        var gender_row = $(selector + '_gender__row');
        var occupation_row = $(selector + '_occupation__row');
        var email_row = $(selector + '_email__row');
        var mobile_phone_row = $(selector + '_mobile_phone__row');
        var box_bottom = $(selector + '_box_bottom');
        $(selector + '__row').hide()
                             .after(box_bottom)
                             .after(mobile_phone_row)
                             .after(email_row)
                             .after(occupation_row)
                             .after(gender_row)
                             .after(date_of_birth_row)
                             .after(name_row)
                             .after(title_row)
                             .after(error_row);

        title_row.show();
        name_row.show();
        date_of_birth_row.show();
        gender_row.show();
        occupation_row.show();
        email_row.show();
        mobile_phone_row.show();
        box_bottom.show();

        var value = real_input.val();
        if (value) {
            // Update form: disable the fields by default
            disable_person_fields(fieldname);
        } else {
            // Create form: Enable the Autocomplete
            enable_autocomplete(fieldname);
        }

        $('form').submit(function() {
            // The form is being submitted

            // Do the normal form-submission tasks
            // @ToDo: Look to have this happen automatically
            // http://forum.jquery.com/topic/multiple-event-handlers-on-form-submit
            // http://api.jquery.com/bind/
            S3ClearNavigateAwayConfirm();

            // Ensure that all fields aren't disabled (to avoid wiping their contents)
            enable_person_fields(fieldname);

            // Allow the Form's Save to continue
            return true;
        });
    }

    var enable_person_fields = function(fieldname) {
        var selector = '#' + fieldname;
        $(selector + '_full_name').prop('disabled', false);
        $(selector + '_gender').prop('disabled', false);
        $(selector + '_date_of_birth').prop('disabled', false);
        $(selector + '_occupation').prop('disabled', false);
        $(selector + '_email').prop('disabled', false);
        $(selector + '_mobile_phone').prop('disabled', false);
        // Hide the edit button
        $(selector + '_edit_bar .icon-edit').hide();
        // Enable the Autocomplete
        enable_autocomplete(fieldname);
    }

    var disable_person_fields = function(fieldname) {
        var selector = '#' + fieldname;
        $(selector + '_full_name').prop('disabled', true);
        $(selector + '_gender').prop('disabled', true);
        $(selector + '_date_of_birth').prop('disabled', true);
        $(selector + '_occupation').prop('disabled', true);
        $(selector + '_email').prop('disabled', true);
        $(selector + '_mobile_phone').prop('disabled', true);
        // Show the edit bar
        $(selector + '_edit_bar').removeClass('hide').show();
        // Listen to Events
        $(selector + '_edit_bar .icon-edit').click(function() {
            enable_person_fields(fieldname);
        });
        $(selector + '_edit_bar .icon-remove').click(function() {
            clear_person_fields(fieldname);
        });
    }

    var clear_person_fields = function(fieldname) {
        var selector = '#' + fieldname;
        // Clear all values & Enable Fields
        $(selector).val('');
        $(selector + '_full_name').prop('disabled', false).val('');
        $(selector + '_gender').prop('disabled', false).val('');
        $(selector + '_date_of_birth').prop('disabled', false).val('');
        $(selector + '_occupation').prop('disabled', false).val('');
        $(selector + '_email').prop('disabled', false).val('');
        $(selector + '_mobile_phone').prop('disabled', false).val('');
        // Hide the edit bar
        $(selector + '_edit_bar').hide();
    }

    var enable_autocomplete = function(fieldname) {
        var selector = '#' + fieldname;
        var dummy_input = $(selector + '_full_name');
        if (dummy_input.attr('autocomplete')) {
            // Already setup
            return;
        }

        var real_input = $(selector);
        var controller = dummy_input.attr('data-c');
        // Add a Throbber
        $(selector + '_full_name').after('<div id="' + fieldname + '_throbber" class="throbber hide"></div>');
        var throbber = $(selector + '_throbber');

        var url = S3.Ap.concat('/' + controller + '/person/search_ac');
        var data = {
            val: dummy_input.val(),
            accept: false
        };
        dummy_input.autocomplete({
            // @ToDo: Configurable options
            delay: 450,
            minLength: 2,
            source: function(request, response) {
                // Patch the source so that we can handle No Matches
                $.ajax({
                    url: url,
                    data: {
                        term: request.term
                    }
                }).done(function (data) {
                    if (data.length == 0) {
                        var no_matching_records = i18n.no_matching_records;
                        data.push({
                            id: 0,
                            value: '',
                            label: no_matching_records,
                            // First Name
                            first: no_matching_records
                        });
                    } else {
                        var none_of_the_above = i18n.none_of_the_above;
                        data.push({
                            id: 0,
                            value: '',
                            label: none_of_the_above,
                            // First Name
                            first: none_of_the_above
                        });
                    }
                    response(data);
                });
            },
            search: function(event, ui) {
                dummy_input.hide();
                throbber.removeClass('hide').show();
                return true;
            },
            response: function(event, ui, content) {
                throbber.hide();
                dummy_input.show();
                return content;
            },
            focus: function(event, ui) {
                var item = ui.item;
                var name = item.first;
                if (item.middle) {
                    name += ' ' + item.middle;
                }
                if (item.last) {
                    name += ' ' + item.last;
                }
                dummy_input.val(name);
                return false;
            },
            select: function(event, ui) {
                var item = ui.item;
                if (item.id) {
                    var name = item.first;
                    if (item.middle) {
                        name += ' ' + item.middle;
                    }
                    if (item.last) {
                        name += ' ' + item.last;
                    }
                    dummy_input.val(name);
                    real_input.val(item.id);
                    // Update the Form Fields
                    select_person(fieldname, item.id);
                } else {
                    // 'No matching results' or 'None of the above'
                    dummy_input.val('');
                    real_input.val('');
                }
                data.accept = true;
                return false;
            }
        })
        .data('ui-autocomplete')._renderItem = function(ul, item) {
            var name = item.first;
            if (item.middle) {
                name += ' ' + item.middle;
            }
            if (item.last) {
                name += ' ' + item.last;
            }
            return $('<li>').data('item.autocomplete', item)
                            .append('<a>' + name + '</a>')
                            .appendTo(ul);
        };
        // @ToDo: Do this only if new_items=False
        dummy_input.blur(function() {
            if (!dummy_input.val()) {
                real_input.val('');
                data.accept = true;
            }
            if (!data.accept) {
                dummy_input.val(data.val);
            } else {
                data.val = dummy_input.val();
            }
            data.accept = false;
        });
    }

    // Called on post-process by the Autocomplete Widget
    var select_person = function(fieldname, person_id) {
        clear_person_fields(fieldname);
        var selector = '#' + fieldname;
        var real_input = $(selector);
        var name_input = $(selector + '_full_name');
        var controller = name_input.attr('data-c');
        var url = S3.Ap.concat('/' + controller + '/person/' + person_id + '.s3json?show_ids=True');
        $.getJSONS3(url, function(data) {
            try {
                var email = undefined,
                    phone = undefined;
                var person = data['$_pr_person'][0];
                disable_person_fields(fieldname);
                real_input.val(person['@id']);
                var names = [];
                if (person.hasOwnProperty('first_name')) {
                    names.push(person['first_name']);
                }
                if (person.hasOwnProperty('middle_name')) {
                    names.push(person['middle_name']['@value']);
                }
                if (person.hasOwnProperty('last_name')) {
                    names.push(person['last_name']['@value']);
                }
                name_input.val(names.join(' '));
                if (person.hasOwnProperty('gender')) {
                    $(selector + '_gender').val(person['gender']['@value']);
                }
                if (person.hasOwnProperty('date_of_birth')) {
                    $(selector + '_date_of_birth').val(person['date_of_birth']['@value']);
                }
                if (person.hasOwnProperty('occupation')) {
                    $(selector + '_occupation').val(person['occupation']['@value']);
                }
                if (person.hasOwnProperty('$_pr_email_contact')) {
                    var contact = person['$_pr_email_contact'][0];
                    email = contact['value']['@value'];                            
                }
                if (person.hasOwnProperty('$_pr_phone_contact')) {
                    var contact = person['$_pr_phone_contact'][0];
                    phone = contact['value']['@value'];                            
                }                       
                if (person.hasOwnProperty('$_pr_contact')) {
                    var contacts = person['$_pr_contact'];
                    var contact;
                    for (var i=0; i < contacts.length; i++) {
                        contact = contacts[i];
                        if (email == undefined){
                            if (contact['contact_method']['@value'] == 'EMAIL') {
                                email = contact['value']['@value'];
                            }
                        }
                        if (phone == undefined){
                            if (contact['contact_method']['@value'] == 'SMS') {
                                phone = contact['value']['@value'];
                            }
                        }
                    }
                }
                if (email !== undefined){
                    $(selector + '_email').val(email);
                }
                if (phone !== undefined){
                    $(selector + '_mobile_phone').val(phone);
                }

            } catch(e) {
                real_input.val('');
            }
        });
    }

}());