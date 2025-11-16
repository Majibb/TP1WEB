const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let search = "";
let pageManager;
let itemLayout;
const minKeywordLength = 2;
let showKeywords = false;
let searchVisible = false;

let waiting = null;
let waitingGifTrigger = 2000;

function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    $("#itemsPanel").append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'>" +
          "<img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}

function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

Init_UI();

async function Init_UI() {
  pageManager = new PageManager(
    "scrollPanel",
    "itemsPanel",
    "sample",
    renderNouvelles
  );
  hideSearchField(false);

  $("#createNouvelle").on("click", async function () {
    renderCreateNouvelleForm();
  });
  $("#abort").on("click", async function () {
    ShowNouvelles();
    deleteError();
  });
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  $("#searchCmd").on("change", () => {
    doSearch();
  });
  $("#doSearch").on("click", () => {
    toggleSearchField();
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

function showSearchField(focusInput = true) {
  $("#search").removeClass("searchCollapsed");
  searchVisible = true;
  if (focusInput) $("#searchCmd").focus();
}

function hideSearchField(blurInput = true) {
  $("#search").addClass("searchCollapsed");
  searchVisible = false;
  if (blurInput) $("#searchCmd").blur();
}

function toggleSearchField() {
  if (searchVisible) hideSearchField();
  else showSearchField();
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
  $("#searchCmd").show();
  $("#doSearch").show();

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
  $("#doSearch").hide();

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
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  $("#allCatCmd").on("click", function () {
    ShowNouvelles();
    selectedCategory = "";
    updateDropDownMenu();
    pageManager.reset();
  });
  $(".category").on("click", function () {
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
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
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
      Nouvelles.forEach((Nouvelle) => {
        container.append(renderNouvelle(Nouvelle));
      });
      highlightKeywords();
    } else endOfData = true;
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
  let response = await Nouvelles_API.Get(id);
  if (!Nouvelles_API.error) {
    let Nouvelle = response.data;
    if (Nouvelle !== null) renderNouvelleForm(Nouvelle);
    else renderError("Nouvelle introuvable!");
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

  $("#nouvelleForm").show();
  $("#nouvelleForm").empty();
  let response = await Nouvelles_API.Get(id);
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
                            <div class="NouvelleHeader">
                                <span class="NouvelleTitle">${Nouvelle.Title}</span>
                                <span class="NouvelleCategory">${Nouvelle.Category}</span>
                                <span class="NouvelleDate">${convertToFrenchDate(Nouvelle.Creation)}</span>
                            </div>
                            <div class="NouvelleText showExtra">${convertTextToHtml(Nouvelle.Text || "")}</div>
                        </div>
                     </div>
                </div>   
                <br>
                
               
            </div>    
            `);
      $("#deleteNouvelle").on("click", async function () {
        $(this).off("click");
        await Nouvelles_API.Delete(Nouvelle.Id);
        if (!Nouvelles_API.error) {
          ShowNouvelles();
          await pageManager.update();
          compileCategories();
        } else {
          console.log(Nouvelles_API.currentHttpError);
          renderError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", function () {
        ShowNouvelles();
      });
    } else {
      renderError("Nouvelle introuvable!");
    }
  } else renderError(Nouvelles_API.currentHttpError);
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
      Nouvelle.Image = "/news-logo.png";
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
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
             
                value="${Nouvelle.Title}"
            />
            
            <label for="Text" class="form-label">Texte </label>
            <textarea 
                class="form-control NouvelleTextContaint"
                name="Text" 
                id="Text" 
                placeholder="Texte"
                rows="4"
                required
                RequireMessage="Veuillez entrer un texte"> 
                ${Nouvelle.Text}
            </textarea>
            
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
  initImageUploaders();
  initFormValidation();


  $("#NouvelleForm").on("submit", async function (event) {
    event.preventDefault();
    let Nouvelle = getFormData($("#NouvelleForm"));
    let imageValue = $("#Image").val();

    if (imageValue) {
      Nouvelle.Image = imageValue;
    }
    if (create && !Nouvelle.Image) {
      alert("Veuillez sélectionner une image");
      return;
    }

    Nouvelle = await Nouvelles_API.Save(Nouvelle, create);

    if (!Nouvelles_API.error) {
      ShowNouvelles();
      await pageManager.update();
      compileCategories();
      pageManager.scrollToElem(Nouvelle.Id);
    } else renderError("Une erreur est survenue!");
  });

  $("#cancel").on("click", function () {
    ShowNouvelles();
  });
}
function renderNouvelle(Nouvelle) {
  const hasText = (Nouvelle.Text || "").trim().length > 0;
  const textSection = hasText
    ? `
                <div class="NouvelleText postText hideExtra">${convertTextToHtml(
                  Nouvelle.Text || "")}</div>
                <div class="NouvelleTextToggle">
                    <span class="textToggle expandText fa-solid fa-angles-down" title="Agrandir le texte"></span>
                    <span class="textToggle collapseText fa-solid fa-angles-up" title="Reduire le texte"></span>
                </div>
    `
    : "";

  let nouvelleElement = $(`
    <div class="NouvelleRow" id='${Nouvelle.Id}'>
        <div class="NouvelleContainer noselect">
            <div class="NouvelleLayout">
            <span class="NouvelleCategory">${Nouvelle.Category}</span>
                <img class="NouvelleImage " src="${Nouvelle.Image}" alt="Image pour ${Nouvelle.Title}">
                <div class="NouvelleHeader">
                    <span class="NouvelleTitle postTitle">${Nouvelle.Title}</span>
                    <span class="NouvelleDate">${convertToFrenchDate(Nouvelle.Creation)}</span>
                </div>
                ${textSection}
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

  if (hasText) installNouvelleTextToggle(nouvelleElement);

  return nouvelleElement;
}

function convertToFrenchDate(numeric_date) {
    let date = new Date(numeric_date);
    var options = {year: 'numeric', month: 'long', day: 'numeric'};
    var opt_weekday = {weekday: 'long'};
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " a " + date.toLocaleTimeString("fr-FR");
}

function convertTextToHtml(text) {
    return text.replace(/\n/g, '<br>');
}

function UTC_To_Local(UTC_numeric_date) {
    let UTC_Offset = new Date().getTimezoneOffset() / 60;
    let UTC_Date = new Date(UTC_numeric_date);
    UTC_Date.setHours(UTC_Date.getHours() - UTC_Offset);
    let Local_numeric_date = UTC_Date.getTime();
    return Local_numeric_date;
}

function Local_to_UTC(Local_numeric_date) {
    let UTC_Offset = new Date().getTimezoneOffset() / 60;
    let Local_Date = new Date(Local_numeric_date);
    Local_Date.setHours(Local_Date.getHours() + UTC_Offset);
    let UTC_numeric_date = Local_Date.getTime();
    return UTC_numeric_date;
}

function installNouvelleTextToggle(nouvelleElement) {
    const textBlock = nouvelleElement.find(".postText");
    const expandCtrl = nouvelleElement.find(".expandText");
    const collapseCtrl = nouvelleElement.find(".collapseText");

    if (
        textBlock.length === 0 ||
        expandCtrl.length === 0 ||
        collapseCtrl.length === 0
    ) {
        return;
    }

    const setState = (expanded) => {
        if (expanded) {
            textBlock.removeClass("hideExtra").addClass("showExtra");
        } else {
            textBlock.removeClass("showExtra").addClass("hideExtra");
        }
        expandCtrl.toggleClass("disabled", expanded);
        collapseCtrl.toggleClass("disabled", !expanded);
    };

    expandCtrl.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!expandCtrl.hasClass("disabled")) {
            setState(true);
        }
    });

    collapseCtrl.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!collapseCtrl.hasClass("disabled")) {
            setState(false);
        }
    });

    setState(false);
}

function highlight(text, elem) {
    text = text.trim().toLocaleLowerCase();
    if (text.length >= minKeywordLength) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML
                .toLocaleLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText =
                    "<span class='highlight'>" +
                    innerHTML.substring(index, index + text.length) +
                    "</span>";
                innerHTML =
                    innerHTML.substring(0, index) +
                    highLightedText +
                    innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}

function highlightKeywords() {
    showKeywords = search.trim().length > 0;
    if (showKeywords) {
        let keywords = $("#searchCmd").val().split(" ");
        if (keywords.length > 0) {
            keywords.forEach((key) => {
                let titles = document.getElementsByClassName("postTitle");
                Array.from(titles).forEach((title) => {
                    highlight(key, title);
                });
                let texts = document.getElementsByClassName("postText");
                Array.from(texts).forEach((textElem) => {
                    highlight(key, textElem);
                });
            });
        }
    }
}
