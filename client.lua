QBCore = exports['qb-core']:GetCoreObject()

local seatbeltOn = false
local cruiseOn = false
local cachedPed = nil
local isInVehicle = false

local voiceState = "NORMAL"
local isTalking = false

AddEventHandler('pma-voice:setTalkingMode', function(mode)
    local newState = "NORMAL"
    
    if mode == 1 then
        newState = "SUSURRANDO"
    elseif mode == 2 then
        newState = "NORMAL"
    elseif mode == 3 then
        newState = "GRITANDO"
    end
    
    voiceState = newState
    SendNUIMessage({
        type = 'updateVoice',
        state = voiceState,
        talking = isTalking
    })
end)

function updateVoice()
    if isTalking ~= MumbleIsPlayerTalking(PlayerId()) then
        isTalking = MumbleIsPlayerTalking(PlayerId())
        SendNUIMessage({
            type = 'updateVoice',
            state = voiceState,
            talking = isTalking
        })
    end
end

function GetPlayerStats()
    local playerPed = cachedPed or PlayerPedId()
    local health = GetEntityHealth(playerPed) - 100
    local maxHealth = GetEntityMaxHealth(playerPed) - 100
    local PlayerData = QBCore.Functions.GetPlayerData()
    local hunger = PlayerData.metadata and PlayerData.metadata['hunger'] or 100
    local thirst = PlayerData.metadata and PlayerData.metadata['thirst'] or 100
    local stamina = GetPlayerStamina(PlayerId())
    
    return {
        health = (health / maxHealth) * 100,
        hunger = hunger,
        thirst = thirst,
        stamina = stamina
    }
end

local directions = {
    [0] = "N", [1] = "NE", [2] = "E", [3] = "SE",
    [4] = "S", [5] = "SW", [6] = "W", [7] = "NW", [8] = "N"
}

function GetDirectionFromHeading(heading)
    local index = math.floor((heading + 22.5) / 45)
    return directions[index % 8]
end

function GetLocationInfo()
    local coords = GetEntityCoords(cachedPed)
    local heading = GetEntityHeading(cachedPed)
    local direction = GetDirectionFromHeading(heading)
    
    local streetHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local street = GetStreetNameFromHashKey(streetHash)
    local zone = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z))
    
    return {
        street = street,
        zone = zone,
        heading = direction
    }
end

Citizen.CreateThread(function()
    local timer = 0
    local vehicleTimer = 0
    while true do
        Citizen.Wait(80)
        cachedPed = PlayerPedId()
        isInVehicle = IsPedInAnyVehicle(cachedPed, false)

        updateVoice()

        vehicleTimer = vehicleTimer + 80
        if vehicleTimer >= 120 then
            coche()
            vehicleTimer = 0
        end

        timer = timer + 80
        if timer >= 400 then
            location()
            datos()
            mapa()
            timer = 0
        end
    end
end)

function coche()
    if isInVehicle then
        local vehicle = GetVehiclePedIsIn(cachedPed, false)
        local class = GetVehicleClass(vehicle)
        local speed = GetEntitySpeed(vehicle) * 3.6
        local fuel = exports["gacha_fuel"]:GetFuel(vehicle)
        
        SendNUIMessage({
            type = 'updateVehicle',
            speed = math.floor(speed),
            fuel = fuel,
            isInVehicle = true,
            seatbelt = seatbeltOn,
            showSeatbelt = (class ~= 8 and class ~= 13 and class ~= 14)
        })
    else
        SendNUIMessage({
            type = 'updateVehicle',
            isInVehicle = false
        })
    end
end

function location()
    if isInVehicle then
        local locationInfo = GetLocationInfo()
        SendNUIMessage({
            type = 'updateLocation',
            zone = locationInfo.zone,
            street = locationInfo.street,
            heading = locationInfo.heading,
            showLocationInfo = true
        })
    else
        SendNUIMessage({
            type = 'updateLocation',
            showLocationInfo = false
        })
    end
end

function datos()
    local stats = GetPlayerStats()
    SendNUIMessage({
        type = 'update',
        health = stats.health,
        hunger = stats.hunger,
        thirst = stats.thirst,
        stamina = stats.stamina
    })
end

function mapa()
    if not Config.MiniMapOnWalk then
        DisplayRadar(isInVehicle)
    else
        DisplayRadar(true)
    end

    local isMapActive = IsRadarEnabled() and not IsRadarHidden()
    SetRadarZoom(1100)
    
    SendNUIMessage({
        type = 'toggleMap',
        mapActive = isMapActive
    })
end

RegisterCommand('toggleseatbelt', function()
    if isInVehicle then
        local vehicle = GetVehiclePedIsIn(cachedPed, false)
        local class = GetVehicleClass(vehicle)
        
        if class ~= 8 and class ~= 13 and class ~= 14 then
            seatbeltOn = not seatbeltOn
            SendNUIMessage({ 
                action = "seatbelt",
                value = seatbeltOn
            })
            
            QBCore.Functions.Notify(
                seatbeltOn and 'Te has puesto el cinturón' or 'Te has quitado el cinturón',
                seatbeltOn and 'success' or 'error',
                5000
            )
        end
    end
end)

RegisterKeyMapping('toggleseatbelt', 'Toggle Seatbelt', 'keyboard', 'B')
