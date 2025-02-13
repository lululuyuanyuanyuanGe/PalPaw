# PalPaw

# Table of contents
1. [What do we do?](#introduction)
2. [Why PalPaw?](#why-palpaw)
    1. [Motivation](#motivation)
3. [How to Install?](#how-to-install)
4. [Getting Started](#getting-started)
5. [Contribution](#contribution)
   1. [Tracking Issue](#tracking-issue)
   2. [Branch Naming](#branch-naming)
   3. [How to make a Pull Request](#how-to-make-a-pull-request)
5. [How to Get Support?](#support)
6. [How to Make a Donation](#donation)


## What do we do? <a name="introduction"></a>
- Enhance Wildlife Rescue Process: Users can connect to the most suitable Wildlife centers using information provided on PalPaw, which increases efficiency and minimizes the delay of rescue processes.
- Empower Wildlife Center: Wildlife centers can posts updates about themselves, look for volunteers and donors.
- Building a community: Animal enthusiasts and Wildlife Centres can post stories, lost-pet notices, pet adoption information.
- Accessible Pet Product: Users can purchase pet products online with positive and professional customer service.

## Why PalPaw? <a name="why-palpaw"></a>
PalPaw provides an integrated platform that allows animal enthusiasts, pet owners, and Wildlife Centres to connect in a way that no other animal-related platform offers. With PalPaw, you can check updates about nearby Wildlife Centres easily and decide who to call in case of emergency. 

PalPaw also enhances community engagement through its diverse and interactive postings. It regularly shares educational content on animal care and wildlife conservation, and responsible pet ownership. Users can post their own experiences, ask questions, and connect with fellow animal lovers, fostering a supportive and engaged community. For pet owners, PalPaw offers a quick and effective way to post lost and found pet alerts, increasing the chances of reuniting missing pets with their families. Whether you're seeking guidance, looking to adopt, or simply sharing your love for animals, PalPaw’s platform ensures that every voice in the animal community is heard. 

Additionally, PalPaw offers an convenient marketplace where pet owners can find high-quality pet products with expert customer support, ensuring the best for their furry companions. 

Whether it’s connecting with a Wildlife Centre, finding a lost pet, or simply engaging in a community of animal lovers, PalPaw is the ultimate all-in-one solution for wildlife rescuers and pet owners alike.

### Motivation <a name="motivation"></a>
According to Ontario Wildlife Rescue, current wildlife centres are strictly regulated which leads to a reduction in number of facilities drastically. This often leaves rescuers with difficulties to connect to suitable Wildlife Centers. Therefore, PalPaw exists to bridge this gap by providing a comprehensive and accessible platform for both wildlife and pet-related services. 

Beyond wildlife rescue, PalPaw also serves as a central hub for pet owners and enthusiasts. The platform facilitates pet adoption, lost and found pet services, and educational content on pet care and animal welfare. Users can engage with a thriving community by sharing experiences, seeking advice, and staying informed about best practices in pet ownership.

With PalPaw, we anticipate:
- Success rate of wildlife rescues improved
- Postings that raise awareness and enhance knowledge 
- A dedicated platform for pet adoption, lost pet notices, and animal-related content sharing
- A trusted marketplace for pet products
- Stronger connections between rescuers, pet owners, Wildlife Centres, and animal lovers
- A more compassionate and informed society


## How to install?<a name="how-to-install"></a>
#### 1. clone the repo
From GitHub, clone it to your local machine.
#### 2. Required Tools
- Node.js
- MongoDB 
#### 3. Frontend
in frontend directory:
```shell
npm install
```
#### 4. Backend
in backend directory:
```shell
npm install
```

## Getting Started <a name="getting-started"></a>
#### Start the Frontend Server
in frontend directory:
```shell
npx expo start
```
#### Start the Backend Server
in backend directory:
in frontend directory:
```shell
npm run dev
```


## Contribution <a name="contribution"></a>
### Tracking Issues <a name="tracking-issue"></a>
We use Jira to track issues. Tickets on Jira should contain:
- Short and Comprehensive Title
- Description: description of the new functionalities or bugs detected

### Branch Naming <a name="branch-naming"></a>
Follow the following format for branch naming: 
- New Feature: feat/FeatureName
- New Hotfix: hotfix/hofixVersion
- New Release: release/releaseVersion

### Git Flow <a name="gitflow"></a>
Git Flow is used to manage our progress. 
- **master branch**: contains the latest code in the production environment. Direct modification is discouraged, the branch only receives merges from other branches.
- **Develop branch**: the main development branch. It integrates changes from feature branches and contains code intended for the next release.
- **Hotfix folder**: contains all hotfix version branches. If a bug is detected during the development process, it should be addressed through a new hotfix branch. The new hotfix branch is then merged to develop and master branch.
- **Release folder**: contains all released version branches
- **Feature folder**: contains all feature branches. A new feature branch should be created for a new functionality. The new feature branch should be merged to develop to be included for the next release.

## How to make a pull request (PR) <a name="how-to-make-a-pull-request"></a>
To make a pull request, follow the temple:

### Title
-   [ ] Has the code been formatted?
-   [ ] Have dependencies/packages been added?

### Changes
Explain the changes made at a higher level

### Testing
-   [ ] Does the code have sufficient automated test coverage? If not, include a reasoning and steps required to manually QA

After the code was approved by one of the members in the team, the pull request will be merged.

## How to get support <a name="support"></a>
For support, contact us at sy.zheng@mail.utoronto.ca. Please allow 3-5 business days for a reply. Do not hesitate to reach out if you have any questions!

## How to make a donation <a name="donation"></a>
To make a donation, e-transfer to sy.zheng@mail.utoronto.ca. Thank you for your support!

