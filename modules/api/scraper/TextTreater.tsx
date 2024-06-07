// @ts-ignore
import DomSelector from 'react-native-dom-parser';

// jeg hader lectio med hele mit hjerte.
// desuden hader jeg også hvem end der har lavet react-native-dom-parser, for det virker ikke en skid
export function _treat(text: string) {
    return text.replace(/<(\/.*)[\n ]+>/gm, "<$1>").replace(/ (.+?)[ ]*=[ ]*('|")(.*?)('|")/gms, " $1=\"$3\"").replace(/<!--[^]*?-->/gm, "").replace(/(\w+=".*?")"/g, "$1");
}

export default async function treat(res: Response): Promise<DomSelector> {
    const regexTreated = _treat(await res.text());
    return DomSelector(regexTreated);
}

export function treatRaw(text: string): DomSelector {
    return DomSelector(_treat(text));
}