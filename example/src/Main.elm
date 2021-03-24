port module Main exposing (main)

import Platform


main : Program Int Model Msg
main =
    Platform.worker
        { init = init
        , subscriptions = subscriptions
        , update = update
        }


type alias Model =
    Int


init : Int -> ( Model, Cmd Msg )
init initialCount =
    ( initialCount, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    incrementBy IncrementBy


port count : Int -> Cmd msg


port incrementBy : (Int -> msg) -> Sub msg


type Msg
    = IncrementBy Int


update : Msg -> Model ->  ( Model, Cmd Msg )
update msg model =
    case msg of
        IncrementBy amount ->
             ( model + amount
             , count (model + amount)
             )