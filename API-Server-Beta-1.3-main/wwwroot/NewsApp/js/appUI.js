const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let pageManager;
let itemLayout;

let waiting = null;
let waitingGifTrigger = 2000;

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
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
    ShowNouvelles();

    Nouvelles_API.start_Periodic_Refresh(async () => { await pageManager.update(); });
}
function ShowNouvelles() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#nouvelleForm').hide();
    $('#aboutContainer').hide();
    $("#createNouvelle").show();
    $('#categoriesMenu').show()
    Nouvelles_API.resume_Periodic_Refresh();
}
function hideNouvelles() {
    $("#scrollPanel").hide();
    $("#createNouvelle").hide();
    $('#categoriesMenu').hide();
    $("#abort").show();
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
    queryString += "&sort=category,title";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
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
    $('#nouvelleForm').show();
    $('#nouvelleForm').empty();
    let response = await Nouvelles_API.Get(id)
    if (!Nouvelles_API.error) {
        let Nouvelle = response.data;
        if (Nouvelle !== null) {
            $("#nouvelleForm").append(`
            <div class="NouvelledeleteForm">
                <h4>Effacer la nouvelle?</h4>
                <br>
                <div class="NouvelleRow" id="${Nouvelle.Id}">
                    <div class="NouvelleContainer noselect">
                        <div class="NouvelleLayout">
                            <div class="Nouvelle">
                                
                                <span class="NouvelleTitle">${Nouvelle.Title}</span>
                            </div>
                            <span class="NouvelleCategory">${Nouvelle.Category}</span>
                        </div>
                     </div>
                </div>   
                <br>
                <input type="button" value="Effacer" id="deleteNouvelle" class="btn btn-primary">
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
            </div>    
            `);
            $('#deleteNouvelle').on("click", async function () {
                await Nouvelles_API.Delete(Nouvelle.Id);
                if (!Nouvelles_API.error) {
                    ShowNouvelles();
                    await pageManager.update();
                    compileCategories();
                }
                else {
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
    Nouvelle.Created= Date.now();
    return Nouvelle;
}

function renderNouvelleForm(Nouvelle = null) {
    hideNouvelles();
    let create = Nouvelle == null;
    if (create)
        Nouvelle = newNouvelle();
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#nouvelleForm").show();
    $("#nouvelleForm").empty();
    $("#nouvelleForm").append(`
        <form class="form" id="NouvelleForm">
            <br>
            <input type="hidden" name="Id" value="${Nouvelle.Id}"/>
            
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
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
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
            
            <label for="ImageFile" class="form-label">Image </label>
            <input 
                type="file"
                class="form-control"
                id="ImageFile"
                accept="image/*"
            />
            
            <!-- Champ caché pour stocker l'image en base64 -->
            <input type="hidden" name="Image" id="ImageData" value="${Nouvelle.Image}"/>
            
            <div id="imagePreview" class="mt-3" style="max-width: 300px;">
                ${Nouvelle.Image ? `<img src="${Nouvelle.Image}" class="img-fluid" alt="Aperçu"/>` : ''}
            </div>
            
            <br>
            <input type="submit" value="Enregistrer" id="saveNouvelle" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);

    initFormValidation();

    // Gérer le changement de fichier image
    $('#ImageFile').on("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            // Vérifier que c'est bien une image
            if (!file.type.startsWith('image/')) {
                alert('Veuillez sélectionner un fichier image valide');
                $(this).val(''); // Réinitialiser l'input
                return;
            }

            // Vérifier la taille (max 1MB)
            if (file.size > 1024 * 1024) {
                alert('L\'image est trop volumineuse. Taille maximum: 1MB');
                $(this).val(''); // Réinitialiser l'input
                return;
            }

            // Convertir l'image en Base64
            const reader = new FileReader();
            reader.onload = function (e) {
                const base64Image = e.target.result;
                // Stocker dans le champ caché
                $('#ImageData').val(base64Image);
                // Afficher l'aperçu
                $('#imagePreview').html(`<img src="${base64Image}" class="img-fluid" alt="Aperçu"/>`);
            };
            reader.onerror = function() {
                alert('Erreur lors de la lecture du fichier');
            };
            reader.readAsDataURL(file);
        }
    });

    $('#NouvelleForm').on("submit", async function (event) {
        event.preventDefault();
        let Nouvelle = getFormData($("#NouvelleForm"));

        // Vérifier qu'une image a été sélectionnée si c'est une création
        if (create && !Nouvelle.Image) {
            alert('Veuillez sélectionner une image');
            return;
        }

        Nouvelle = await Nouvelles_API.Save(Nouvelle, create);
        if (!Nouvelles_API.error) {
            ShowNouvelles();
            await pageManager.update();
            compileCategories();
            pageManager.scrollToElem(Nouvelle.Id);
        }
        else
            renderError("Une erreur est survenue!");
    });

    $('#cancel').on("click", function () {
        ShowNouvelles();
    });
}
function makeFavicon(url, big = false) {
    // Utiliser l'API de google pour extraire le favicon du site pointé par url
    // retourne un élément div comportant le favicon en tant qu'image de fond
    ///////////////////////////////////////////////////////////////////////////
    if (url.slice(-1) != "/") url += "/";
    let faviconClass = "favicon";
    if (big) faviconClass = "big-favicon";
    url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;
    return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}
function renderNouvelle(Nouvelle) {
    //let favicon = makeFavicon(Nouvelle.Url);
    let nouvelleElement = $(`
    <div class="NouvelleRow" id='${Nouvelle.Id}'>
        <div class="NouvelleContainer noselect">
            <div class="NouvelleLayout">
                <div class="NouvelleCategory">
                    
                    <span class="NouvelleTitle">${Nouvelle.Title}</span>
                </div>
                <span class="NouvelleCategory">${Nouvelle.Category}</span>
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
