export type Profile = {
    name: string,
    username: string,

    school: string,

    notifications: {
        aflysteLektioner: boolean,
        ændredeLektioner: boolean,
        beskeder: boolean,
    }
}

