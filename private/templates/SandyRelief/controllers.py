# -*- coding: utf-8 -*-

from os import path

from gluon import *
from gluon.storage import Storage
from s3 import *

# =============================================================================
class index():
    """ Custom Home Page """

    def __call__(self):

        request = current.request
        response = current.response
        response.title = current.deployment_settings.get_system_name()

        T = current.T
        db = current.db
        s3db = current.s3db
        s3 = response.s3
        appname = request.application
        settings = current.deployment_settings

        # Check logged in and permissions
        auth = current.auth
        roles = current.session.s3.roles
        system_roles = auth.get_system_roles()
        ADMIN = system_roles.ADMIN
        AUTHENTICATED = system_roles.AUTHENTICATED
        s3_has_role = auth.s3_has_role

        # CMS
        item = ""
        if settings.has_module("cms"):
            table = s3db.cms_post
            item = db(table.module == "default").select(table.id,
                                                        table.body,
                                                        limitby=(0, 1)).first()
            if item:
                if s3_has_role(ADMIN):
                    item = DIV(XML(item.body),
                               BR(),
                               A(T("Edit"),
                                 _href=URL(c="cms", f="post",
                                           args=[item.id, "update"],
                                           vars={"module":"default"}),
                                 _class="action-btn"))
                else:
                    item = XML(item.body)
            elif s3_has_role(ADMIN):
                item = DIV(A(T("Edit"),
                             _href=URL(c="cms", f="post", args="create",
                                       vars={"module":"default"}),
                             _class="action-btn"))
            else:
                item = ""
            
        # Big Buttons
        big_buttons = DIV(
                        A(DIV(T("Request Items"),
                              _class = "menu-btn-r"),
                          _class = "menu-btn-l",
                          _href = URL(c="req", f="req", args=["create"], vars={"type":1})
                          ),
                        A(DIV(T("Request People"),
                              _class = "menu-btn-r"),
                          _class = "menu-btn-l",
                          _href=URL(c="req", f="req", args=["create"], vars={"type":3})
                          ),
                        A(DIV(T("Fulfil Requests"),
                              _class = "menu-btn-r"),
                          _class = "menu-btn-l",
                          _href=URL(c="req", f="req", args=["search"])
                          ),
                        _id = "sit_dec_res_box",
                        _class = "menu_box fleft swidth")

        # Login/Registration forms
        self_registration = settings.get_security_self_registration()
        registered = False
        login_form = None
        login_div = None
        register_form = None
        register_div = None
        if AUTHENTICATED not in roles:
            # This user isn't yet logged-in
            if request.cookies.has_key("registered"):
                # This browser has logged-in before
                registered = True

            if self_registration:
                # Provide a Registration box on front page
                register_form = auth.register()
                register_div = DIV(H3(T("Register")),
                                   P(XML(T("If you would like to help, then please %(sign_up_now)s") % \
                                            dict(sign_up_now=B(T("sign-up now"))))))

                 # Add client-side validation
                s3_register_validation()

                if request.env.request_method == "POST":
                    post_script = \
'''$('#register_form').removeClass('hide')
$('#login_form').addClass('hide')'''
                else:
                    post_script = ""
                register_script = \
'''$('#register-btn').attr('href','#register')
$('#login-btn').attr('href','#login')
%s
$('#register-btn').click(function(){
 $('#register_form').removeClass('hide')
 $('#login_form').addClass('hide')
})
$('#login-btn').click(function(){
 $('#register_form').addClass('hide')
 $('#login_form').removeClass('hide')
})''' % post_script
                s3.jquery_ready.append(register_script)

            # Provide a login box on front page
            request.args = ["login"]
            auth.messages.submit_button = T("Login")
            login_form = auth()
            login_div = DIV(H3(T("Login")),
                            P(XML(T("Registered users can %(login)s to access the system" % \
                                    dict(login=B(T("login")))))))

        if settings.frontpage.rss:
            s3.external_stylesheets.append("http://www.google.com/uds/solutions/dynamicfeed/gfdynamicfeedcontrol.css")
            s3.scripts.append("http://www.google.com/jsapi?key=notsupplied-wizard")
            s3.scripts.append("http://www.google.com/uds/solutions/dynamicfeed/gfdynamicfeedcontrol.js")
            counter = 0
            feeds = ""
            for feed in settings.frontpage.rss:
                counter += 1
                feeds = "".join((feeds,
                                 "{title:'%s',\n" % feed["title"],
                                 "url:'%s'}" % feed["url"]))
                # Don't add a trailing comma for old IEs
                if counter != len(settings.frontpage.rss):
                    feeds += ",\n"
            # feedCycleTime: milliseconds before feed is reloaded (5 minutes)
            feed_control = "".join(('''
function LoadDynamicFeedControl(){
 var feeds=[
  ''', feeds, '''
 ]
 var options={
  feedCycleTime:300000,
  numResults:5,
  stacked:true,
  horizontal:false,
  title:"''', str(T("News")), '''"
 }
 new GFdynamicFeedControl(feeds,'feed-control',options)
}
google.load('feeds','1')
google.setOnLoadCallback(LoadDynamicFeedControl)'''))
            s3.js_global.append(feed_control)

        view = path.join(request.folder, "private", "templates",
                         "SandyRelief", "views", "index.html")
        try:
            # Pass view as file not str to work in compiled mode
            response.view = open(view, "rb")
        except IOError:
            from gluon.http import HTTP
            raise HTTP("404", "Unable to open Custom View: %s" % view)

        return dict(title = response.title,
                    item = item,
                    big_buttons = big_buttons,
                    self_registration=self_registration,
                    registered=registered,
                    login_form=login_form,
                    login_div=login_div,
                    register_form=register_form,
                    register_div=register_div
                    )

# =============================================================================
class req():
    """
        Function to handle pagination for the requests list on the homepage
    """

    def __call__(self):
        request = current.request
        resource = current.s3db.resource("req_req")
        totalrows = resource.count()
        table = resource.table

        list_fields = ["id", "req_ref"]
        limit = int(request.get_vars["iDisplayLength"]) if request.extension == "aadata" else 1
        rfields = resource.resolve_selectors(list_fields)[0]
        (orderby, filter) = S3DataTable.getControlData(rfields, request.vars)
        resource.add_filter(filter)
        filteredrows = resource.count()
        if isinstance(orderby, bool):
            orderby = ~table.date
        rows = resource.select(list_fields,
                               orderby=orderby,
                               start=0,
                               limit=limit,
                               )
        data = resource.extract(rows,
                                list_fields,
                                represent=True,
                                )
        dt = S3DataTable(rfields, data)
        dt.defaultActionButtons(resource)
        current.response.s3.no_formats = True
        if request.extension == "html":
            items = dt.html(totalrows,
                            filteredrows,
                            "req_list_1",
                            dt_displayLength=10,
                            dt_ajax_url=URL(c="default",
                                            f="index",
                                            args=["req"],
                                            extension="aadata",
                                            vars={"id": "req_list_1"},
                                            ),
                           )
        elif request.extension.lower() == "aadata":
            limit = resource.count()
            if "sEcho" in request.vars:
                echo = int(request.vars.sEcho)
            else:
                echo = None
            items = dt.json(totalrows,
                            filteredrows,
                            "req_list_1",
                            echo)
        else:
            from gluon.http import HTTP
            raise HTTP(501, current.manager.ERROR.BAD_FORMAT)
        return items

# END =========================================================================