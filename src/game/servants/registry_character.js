// src/game/servants/registry_character.js
import { ArcherServants } from './archer';

export const ServantRegistry = {
    Archer: ArcherServants,
    // Add other classes here like:
    // Saber: SaberServants,
    // Lancer: LancerServants,
    // etc...
};

// Utility function to get a servant template
export const getServantTemplate = (servantClass, servantName) => {
    return ServantRegistry[servantClass]?.[servantName]?.template;
};

// Utility function to get all skills for a servant
export const getServantSkills = (servantClass, servantName) => {
    return ServantRegistry[servantClass]?.[servantName]?.skills;
};