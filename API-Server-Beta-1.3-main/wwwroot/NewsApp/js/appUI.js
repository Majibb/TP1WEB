const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let search = "";
let pageManager;
let itemLayout;

let waiting = null;
let waitingGifTrigger = 2000;

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'>" +
            "<img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}

function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

Init_UI()

async function Init_UI() {
    pageManager = new PageManager('scrollPanel', 'itemsPanel', 'sample', renderNouvelles);

    $('#createNouvelle').on("click", async function () {
        renderCreateNouvelleForm();
    });
    $('#abort').on("click", async function () {
        ShowNouvelles();
        deleteError();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $("#searchCmd").on("change", () => {
        doSearch();
    });
    $('#doSearch').on('click', () => {
        doSearch();
    });

    ShowNouvelles();

    Nouvelles_API.start_Periodic_Refresh(async () => {
        await pageManager.update();
    });
}

function doSearch() {
    search = $("#searchCmd").val();
    pageManager.reset();
}

function ShowNouvelles() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#scrollPanel").show();
    $("#nouvelleForm").hide();
    $("#aboutContainer").hide();
    $("#search").show();
    $("#searchCmd").val(search);


    // header actions
    $("#createNouvelle").show();
    $("#categoriesMenu").show();
    $("#saveNouvelle").hide();
    $("#deleteNouvelle").hide();
    $("#cancel").hide();

    Nouvelles_API.resume_Periodic_Refresh();
}

function hideNouvelles() {
    $("#scrollPanel").hide();
    $("#createNouvelle").hide();
    $("#categoriesMenu").hide();

    // header actions
    $("#saveNouvelle").show();
    $("#cancel").show();
    $("#deleteNouvelle").hide();

    Nouvelles_API.stop_Periodic_Refresh();
}

function renderAbout() {
    hideNouvelles();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}

function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        ShowNouvelles();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        ShowNouvelles();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
}

async function compileCategories() {
    categories = [];
    let response = await Nouvelles_API.GetQuery("?select=category&sort=category");
    if (!Nouvelles_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            updateDropDownMenu();
        }
    }
}

async function renderNouvelles(container, queryString) {
    deleteError();
    let endOfData = false;
    queryString += "&sort=-Creation,title";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (search != "") queryString += "&keywords=" + search;
    addWaitingGif();
    compileCategories();
    let response = await Nouvelles_API.Get(queryString);
    if (!Nouvelles_API.error) {
        let Nouvelles = response.data;
        if (Nouvelles.length > 0) {
            Nouvelles.forEach(Nouvelle => {
                container.append(renderNouvelle(Nouvelle));
            });

        } else
            endOfData = true;
    } else {
        renderError(Nouvelles_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}

function renderError(message) {
    hideNouvelles();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}

function deleteError() {
    $("#errorContainer").empty();
}

function renderCreateNouvelleForm() {
    renderNouvelleForm();
}

async function renderEditNouvelleForm(id) {
    addWaitingGif();
    let response = await Nouvelles_API.Get(id)
    if (!Nouvelles_API.error) {
        let Nouvelle = response.data;
        if (Nouvelle !== null)
            renderNouvelleForm(Nouvelle);
        else
            renderError("Nouvelle introuvable!");
    } else {
        renderError(Nouvelles_API.currentHttpError);
    }
    removeWaitingGif();
}

async function renderDeleteNouvelleForm(id) {
    hideNouvelles();
    $("#actionTitle").text("Retrait");
    $("#saveNouvelle").hide();

    $("#deleteNouvelle").show();
    $("#cancel").show();

    $('#nouvelleForm').show();
    $('#nouvelleForm').empty();
    let response = await Nouvelles_API.Get(id)
    if (!Nouvelles_API.error) {
        let Nouvelle = response.data;
        if (Nouvelle !== null) {
            $("#nouvelleForm").append(`
            <div class="NouvelledeleteForm">
                
                <br>
                <div class="NouvelleRow" id="${Nouvelle.Id}">
                    <div class="NouvelleContainer noselect">
                        <div class="NouvelleLayout">
                            <img class="NouvelleImage" src="${Nouvelle.Image}" alt="Image pour ${Nouvelle.Title}">
                            <div class="Nouvelle">
                                
                                <span class="NouvelleTitle">${Nouvelle.Title}</span>
                            </div>
                            <span class="NouvelleTitle">${Nouvelle.Text}</span>
                            <span class="NouvelleCategory">${Nouvelle.Category}</span>
                        </div>
                     </div>
                </div>   
                <br>
                
               
            </div>    
            `);
            $('#deleteNouvelle').on("click", async function () {

                $(this).off("click");
                await Nouvelles_API.Delete(Nouvelle.Id);
                if (!Nouvelles_API.error) {
                    ShowNouvelles();
                    await pageManager.update();
                    compileCategories();
                } else {
                    console.log(Nouvelles_API.currentHttpError)
                    renderError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", function () {
                ShowNouvelles();
            });

        } else {
            renderError("Nouvelle introuvable!");
        }
    } else
        renderError(Nouvelles_API.currentHttpError);
}

function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

function newNouvelle() {
    Nouvelle = {};
    Nouvelle.Id = 0;
    Nouvelle.Title = "";
    Nouvelle.Category = "";
    Nouvelle.Text = "";
    Nouvelle.Image = "";
    Nouvelle.Creation = Date.now();
    return Nouvelle;
}

function renderNouvelleForm(Nouvelle = null) {
    hideNouvelles();
    let create = Nouvelle == null;
    if (create) {
        Nouvelle = newNouvelle();
        Nouvelle.Image = "/assetsRepository/news-logo-upload.png";
    }
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#nouvelleForm").show();
    $("#nouvelleForm").empty();
    $("#nouvelleForm").append(`
        <form class="form" id="NouvelleForm">
            <br>
            <input type="hidden" name="Id" value="${Nouvelle.Id}"/>
            <input type="hidden" name="Creation" value="${Nouvelle.Creation}"/>
            
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Nouvelle.Category}"
            />

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
             
                value="${Nouvelle.Title}"
            />
            
            <label for="Text" class="form-label">Texte </label>
            <textarea 
                class="form-control"
                name="Text" 
                id="Text" 
                placeholder="Texte"
                rows="4"
                required
                RequireMessage="Veuillez entrer un texte"
            >${Nouvelle.Text}</textarea>
            
           <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label for="Image" class="form-label">Image </label>
             <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Nouvelle.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            
            <br>
         
        </form>
    `);
    initImageUploaders()
    initFormValidation();


    $('#NouvelleForm').on("submit", async function (event) {
        event.preventDefault();
        let Nouvelle = getFormData($("#NouvelleForm"));
        let imageValue = $('#Image').val();

        if (imageValue) {
            Nouvelle.Image = imageValue;
        }
        Nouvelle = await Nouvelles_API.Save(Nouvelle, create);
        if (create && !Nouvelle.Image) {
            alert('Veuillez sélectionner une image');
            return;
        }


        if (!Nouvelles_API.error) {
            ShowNouvelles();
            await pageManager.update();
            compileCategories();
            pageManager.scrollToElem(Nouvelle.Id);
        } else
            renderError("Une erreur est survenue!");
    });

    $('#cancel').on("click", function () {
        ShowNouvelles();
    });
}

function renderNouvelle(Nouvelle) {
    let nouvelleElement = $(`
    <div class="NouvelleRow" id='${Nouvelle.Id}'>
        <div class="NouvelleContainer noselect">
            <div class="NouvelleLayout">
            <img class="NouvelleImage" src="${Nouvelle.Image}" alt="Image pour ${Nouvelle.Title}">
                <div class="NouvelleCategory">
                    
                    <span class="NouvelleTitle">${Nouvelle.Title}</span>
                </div>
                <span class="NouvelleCategory">${Nouvelle.Category}</span>
                <span class="NouvelleDate">${Nouvelle.Text}</span>
                <span class="NouvelleDate">${convertToFrenchDate(Nouvelle.Creation)}</span>
            </div>
            <div class="NouvelleCommandPanel">
                <span class="editCmd cmdIcon fa fa-pencil" editNouvelleId="${Nouvelle.Id}" title="Modifier ${Nouvelle.Title}"></span>
                <span class="deleteCmd cmdIcon fa fa-trash" deleteNouvelleId="${Nouvelle.Id}" title="Effacer ${Nouvelle.Title}"></span>
            </div>
        </div>
    </div>
    `);

    nouvelleElement.find(".editCmd").on("click", function () {
        renderEditNouvelleForm($(this).attr("editNouvelleId"));
    });

    nouvelleElement.find(".deleteCmd").on("click", function () {
        renderDeleteNouvelleForm($(this).attr("deleteNouvelleId"));
    });

    return nouvelleElement;
}

function convertToFrenchDate(numeric_date) {
    const date = new Date(numeric_date);
    const options = {year: 'numeric', month: 'long', day: 'numeric'};
    const opt_weekday = {weekday: 'long'};
    const weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    const timeString = date.toLocaleTimeString("fr-FR");
    const dateString = date.toLocaleDateString("fr-FR", options);

    return `${weekday} le ${dateString} à ${timeString}`;
}
